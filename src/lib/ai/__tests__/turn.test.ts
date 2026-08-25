import { describe, expect, it, vi } from 'vitest';
import { EmptyTurnError, runTurn, type TurnSender } from '../turn';
import type { OpenAiInputItem, OpenAiTextResult } from '@/lib/openai/client';

const reply = (text: string, toolCalls: OpenAiTextResult['toolCalls'] = []): OpenAiTextResult => ({
  text,
  toolCalls,
  model: 'gpt-5.6-sol',
  responseId: 'resp_1',
  usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
});

const call = (name: string, args: string, callId = 'call_1') => ({
  callId,
  name,
  arguments: args,
});

const okExecutor = async () => ({ output: '{"ok":true}', summary: 'Read something' });

describe('a turn with no tools', () => {
  it('returns the answer', async () => {
    const send = vi.fn<TurnSender>().mockResolvedValue(reply('Here you go.'));

    const result = await runTurn({
      messages: [{ role: 'user', content: 'hello' }],
      tools: [],
      send,
      execute: okExecutor,
    });

    expect(result.text).toBe('Here you go.');
    expect(result.toolRuns).toEqual([]);
    expect(result.stoppedEarly).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('sends the conversation as message items', async () => {
    const send = vi.fn<TurnSender>().mockResolvedValue(reply('ok'));

    await runTurn({
      messages: [
        { role: 'user', content: 'one' },
        { role: 'assistant', content: 'two' },
        { role: 'user', content: 'three' },
      ],
      tools: [],
      send,
      execute: okExecutor,
    });

    expect(send.mock.calls[0][0]).toEqual([
      { role: 'user', content: 'one' },
      { role: 'assistant', content: 'two' },
      { role: 'user', content: 'three' },
    ]);
  });
});

describe('a turn that uses a tool', () => {
  it('runs the tool and asks again with the result', async () => {
    const send = vi
      .fn<TurnSender>()
      .mockResolvedValueOnce(reply('', [call('search_notes', '{"query":"rent"}')]))
      .mockResolvedValueOnce(reply('You mentioned rent in two notes.'));

    const execute = vi.fn().mockResolvedValue({
      output: '{"matches":[]}',
      summary: 'Searched notes for "rent", 2 matches',
    });

    const result = await runTurn({
      messages: [{ role: 'user', content: 'what did I say about rent?' }],
      tools: [],
      send,
      execute,
    });

    expect(execute).toHaveBeenCalledWith('search_notes', { query: 'rent' });
    expect(result.text).toBe('You mentioned rent in two notes.');
    expect(result.toolRuns).toEqual([
      {
        name: 'search_notes',
        arguments: { query: 'rent' },
        summary: 'Searched notes for "rent", 2 matches',
        failed: false,
      },
    ]);

    const secondInput = send.mock.calls[1][0] as OpenAiInputItem[];
    expect(secondInput[1]).toEqual({
      type: 'function_call',
      call_id: 'call_1',
      name: 'search_notes',
      arguments: '{"query":"rent"}',
    });
    expect(secondInput[2]).toEqual({
      type: 'function_call_output',
      call_id: 'call_1',
      output: '{"matches":[]}',
    });
  });

  it('keeps text the model wrote alongside a tool call', async () => {
    const send = vi
      .fn<TurnSender>()
      .mockResolvedValueOnce(reply('Let me look.', [call('list_notes', '{}')]))
      .mockResolvedValueOnce(reply('You have four notes.'));

    const result = await runTurn({
      messages: [{ role: 'user', content: 'how many notes?' }],
      tools: [],
      send,
      execute: okExecutor,
    });

    expect(result.text).toBe('Let me look.\n\nYou have four notes.');
    expect((send.mock.calls[1][0] as OpenAiInputItem[])[1]).toEqual({
      role: 'assistant',
      content: 'Let me look.',
    });
  });

  it('runs several calls from one turn', async () => {
    const send = vi
      .fn<TurnSender>()
      .mockResolvedValueOnce(
        reply('', [call('list_notes', '{}', 'a'), call('list_todos', '{}', 'b')])
      )
      .mockResolvedValueOnce(reply('Done.'));

    const result = await runTurn({
      messages: [{ role: 'user', content: 'summarize everything' }],
      tools: [],
      send,
      execute: okExecutor,
    });

    expect(result.toolRuns).toHaveLength(2);
    expect((send.mock.calls[1][0] as OpenAiInputItem[])).toHaveLength(5);
  });
});

describe('when a tool goes wrong', () => {
  it('tells the model rather than failing the turn', async () => {
    const send = vi
      .fn<TurnSender>()
      .mockResolvedValueOnce(reply('', [call('read_note', '{"path":"gone.md"}')]))
      .mockResolvedValueOnce(reply('That note does not exist.'));

    const execute = vi.fn().mockRejectedValue(new Error('There is no note at gone.md.'));

    const result = await runTurn({
      messages: [{ role: 'user', content: 'read gone.md' }],
      tools: [],
      send,
      execute,
    });

    expect(result.text).toBe('That note does not exist.');
    expect(result.toolRuns[0].failed).toBe(true);
    expect((send.mock.calls[1][0] as OpenAiInputItem[])[2]).toEqual({
      type: 'function_call_output',
      call_id: 'call_1',
      output: 'The tool failed: There is no note at gone.md.',
    });
  });

  it('handles arguments that are not valid JSON', async () => {
    const send = vi
      .fn<TurnSender>()
      .mockResolvedValueOnce(reply('', [call('search_notes', '{not json')]))
      .mockResolvedValueOnce(reply('Sorry about that.'));

    const execute = vi.fn();

    const result = await runTurn({
      messages: [{ role: 'user', content: 'search' }],
      tools: [],
      send,
      execute,
    });

    expect(execute).not.toHaveBeenCalled();
    expect(result.toolRuns[0].failed).toBe(true);
    expect(result.text).toBe('Sorry about that.');
  });
});

describe('limits', () => {
  it('stops after the round limit and says so', async () => {
    const send = vi
      .fn<TurnSender>()
      .mockResolvedValue(reply('Still looking.', [call('list_notes', '{}')]));

    const result = await runTurn({
      messages: [{ role: 'user', content: 'go' }],
      tools: [],
      send,
      execute: okExecutor,
      maxRounds: 2,
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(result.stoppedEarly).toBe(true);
    expect(result.text).toContain('Still looking.');
  });

  it('throws when the limit is reached with nothing to show', async () => {
    const send = vi.fn<TurnSender>().mockResolvedValue(reply('', [call('list_notes', '{}')]));

    await expect(
      runTurn({
        messages: [{ role: 'user', content: 'go' }],
        tools: [],
        send,
        execute: okExecutor,
        maxRounds: 2,
      })
    ).rejects.toBeInstanceOf(EmptyTurnError);
  });

  it('stops when the caller has abandoned the turn', async () => {
    const send = vi
      .fn<TurnSender>()
      .mockResolvedValue(reply('working', [call('list_notes', '{}')]));

    const result = await runTurn({
      messages: [{ role: 'user', content: 'go' }],
      tools: [],
      send,
      execute: okExecutor,
      isAbandoned: () => true,
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(result.stoppedEarly).toBe(true);
  });
});
