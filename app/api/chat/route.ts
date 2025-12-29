import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Mode = 'mentor' | 'file_explainer' | 'issue_solver';


async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  
  return user;
}


function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}


async function verifySessionOwnership(supabase: any, sessionId: string, userId: string) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) {
    console.error('Session ownership check error:', error);
  }
  
  return !!data;
}


function getTableForMode(mode: Mode): string {
  switch (mode) {
    case 'mentor':
      return 'messages';
    case 'file_explainer':
      return 'file_explanations';
    case 'issue_solver':
      return 'issue_solutions';
    default:
      return 'messages';
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const body = await request.json();
  const { session_id, role, content, mode = 'mentor', metadata, file_url, file_path, file_content, language, explanation } = body;

  
  const ownsSession = await verifySessionOwnership(supabase, session_id, user.id);
  if (!ownsSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const table = getTableForMode(mode as Mode);
  
  let insertData: Record<string, any>;
  
  if (mode === 'file_explainer') {
    
    insertData = {
      session_id,
      role,
      file_url: file_url || null,
      file_path: file_path || null,
      file_content: file_content || null,
      language: language || null,
      explanation: explanation || content, 
      metadata: metadata || {}
    };
  } else if (mode === 'issue_solver') {
    
    const { 
      issue_url, issue_title, issue_body, issue_labels,
      current_step, explanation: issueExplanation, solution_plan, 
      git_diff, pr_title, pr_description, pr_solution, pr_files_changed, status
    } = body;
    
    insertData = {
      session_id,
      role,
      issue_url: issue_url || null,
      issue_title: issue_title || null,
      issue_body: issue_body || null,
      issue_labels: issue_labels || null,
      explanation: issueExplanation || content || null,
      solution_plan: solution_plan || null,
      git_diff: git_diff || null,
      pr_title: pr_title || null,
      pr_description: pr_description || null,
      pr_solution: pr_solution || null,
      pr_files_changed: pr_files_changed || null,
      current_step: current_step || 'issue_input',
      status: status || 'in_progress',
      metadata: metadata || {}
    };
  } else {
    
    insertData = {
      session_id,
      role,
      content,
      metadata: metadata || {}
    };
  }

  const { data, error } = await supabase
    .from(table)
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');
  const mode = (searchParams.get('mode') || 'mentor') as Mode;

  if (!sessionId) {
    return NextResponse.json({ error: 'No session_id provided' }, { status: 400 });
  }

  
  const ownsSession = await verifySessionOwnership(supabase, sessionId, user.id);
  if (!ownsSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const table = getTableForMode(mode);

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  
  if (mode === 'issue_solver' && data) {
    const expandedMessages: unknown[] = [];
    
    
    data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    data.forEach((row: any) => {
      
      
      
      
      

      if (row.role === 'user') {
        
        if (row.issue_url) {
          
          expandedMessages.push({
            ...row,
            content: row.issue_url
          });
        } else {
          expandedMessages.push(row);
        }
      } else if (row.role === 'assistant') {
        
        
        
        
        if (row.issue_url) {
          expandedMessages.push({
            ...row,
            id: `${row.id}-user-input`,
            role: 'user',
            content: row.issue_url,
            created_at: new Date(new Date(row.created_at).getTime() - 1000).toISOString() 
          });
        }
        
        
        if (row.explanation) {
          expandedMessages.push({
            ...row,
            id: `${row.id}-explanation`,
            content: row.explanation,
            metadata: { ...row.metadata, step: 'explanation' }
          });
        }
        
        
        if (row.solution_plan) {
          expandedMessages.push({
            ...row,
            id: `${row.id}-solution`,
            content: row.solution_plan,
            created_at: new Date(new Date(row.created_at).getTime() + 1000).toISOString(), 
            metadata: { ...row.metadata, step: 'solution_plan' }
          });
        }
        
        
        if (row.pr_solution) {
          expandedMessages.push({
            ...row,
            id: `${row.id}-pr`,
            content: `## PR Ready!\n\n${row.pr_solution}`,
            created_at: new Date(new Date(row.created_at).getTime() + 2000).toISOString(),
            metadata: { ...row.metadata, step: 'pr_generated' }
          });
        }
      }
    });

    return NextResponse.json({ messages: expandedMessages });
  }

  return NextResponse.json({ messages: data });
}

export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const body = await request.json();
  const { id, mode = 'file_explainer' } = body;


  if (!id) {
    return NextResponse.json({ error: 'No ID provided' }, { status: 400 });
  }

  const table = getTableForMode(mode as Mode);

  
  const { data: record, error: fetchError } = await supabase
    .from(table)
    .select('session_id')
    .eq('id', id)
    .maybeSingle();


  if (fetchError || !record) {
    return NextResponse.json({ error: 'Record not found', details: fetchError?.message }, { status: 404 });
  }

  
  const ownsSession = await verifySessionOwnership(supabase, record.session_id, user.id);
  
  if (!ownsSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('[DELETE API] Delete error:', deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
