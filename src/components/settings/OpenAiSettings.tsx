import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, KeyRound, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import {
  describeOpenAiFailure,
  deleteOpenAiKey,
  isOpenAiAvailable,
  OPENAI_UNAVAILABLE_MESSAGE,
  readOpenAiKeyStatus,
  saveOpenAiKey,
  testOpenAiKey,
  type OpenAiKeyStatus,
} from '@/lib/openai/client';
import { readOpenAiConfig, saveOpenAiConfig } from '@/lib/openai/config';
import { IMAGE_MODELS, TEXT_MODELS, type ImageModel, type TextModel } from '@/lib/openai/models';

type PendingAction = 'save' | 'test' | 'delete' | null;

/**
 * OpenAI credentials and model choices.
 *
 * The key field is write-only by design. It is sent to the backend, cleared on
 * success, and never read back, so the only thing this component ever holds
 * about a saved key is its masked hint.
 */
export const OpenAiSettings = () => {
  const available = isOpenAiAvailable();

  const [keyStatus, setKeyStatus] = useState<OpenAiKeyStatus>({ saved: false, masked: null });
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [pending, setPending] = useState<PendingAction>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [replacing, setReplacing] = useState(false);

  const config = readOpenAiConfig();
  const [textModel, setTextModel] = useState<TextModel>(config.textModel);
  const [imageModel, setImageModel] = useState<ImageModel>(config.imageModel);

  const refreshStatus = useCallback(async () => {
    if (!available) {
      setStatusLoaded(true);
      return;
    }

    try {
      setKeyStatus(await readOpenAiKeyStatus());
    } catch (error) {
      toast({
        title: 'Could not read the key status',
        description: describeOpenAiFailure(error),
        variant: 'destructive',
      });
    } finally {
      setStatusLoaded(true);
    }
  }, [available]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleSaveKey = async () => {
    if (!keyInput.trim()) {
      toast({
        title: 'No key entered',
        description: 'Paste an OpenAI API key before saving.',
        variant: 'destructive',
      });
      return;
    }

    setPending('save');

    try {
      const status = await saveOpenAiKey(keyInput);
      setKeyStatus(status);
      // Clearing on success is the point: nothing keeps the plaintext around.
      setKeyInput('');
      setReplacing(false);
      toast({ title: 'API key saved', description: `Stored as ${status.masked}. Test the connection to confirm it works.` });
    } catch (error) {
      toast({ title: 'Could not save the key', description: describeOpenAiFailure(error), variant: 'destructive' });
    } finally {
      setPending(null);
    }
  };

  const handleTestKey = async () => {
    setPending('test');

    try {
      await testOpenAiKey();
      toast({ title: 'Connection works', description: 'OpenAI accepted the saved key.' });
    } catch (error) {
      toast({ title: 'Connection failed', description: describeOpenAiFailure(error), variant: 'destructive' });
    } finally {
      setPending(null);
    }
  };

  const handleDeleteKey = async () => {
    setPending('delete');

    try {
      setKeyStatus(await deleteOpenAiKey());
      setShowDeleteConfirm(false);
      setReplacing(false);
      toast({ title: 'API key deleted', description: 'Notara removed the stored key from this computer.' });
    } catch (error) {
      toast({ title: 'Could not delete the key', description: describeOpenAiFailure(error), variant: 'destructive' });
    } finally {
      setPending(null);
    }
  };

  const handleModelChange = (next: { textModel?: TextModel; imageModel?: ImageModel }) => {
    const saved = saveOpenAiConfig({ ...readOpenAiConfig(), ...next });
    setTextModel(saved.textModel);
    setImageModel(saved.imageModel);
    toast({ title: 'Model saved', description: `Text: ${saved.textModel} · Image: ${saved.imageModel}` });
  };

  const showKeyField = !keyStatus.saved || replacing;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Label>OpenAI API key</Label>
        <p className="text-sm text-muted-foreground">
          Notara encrypts the key and stores it on this computer, outside your workspace folder. It is never written to
          browser storage and never sent anywhere except OpenAI.
        </p>
      </div>

      {!available && (
        <div className="flex gap-3 rounded-md border border-border bg-muted/40 p-3" role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{OPENAI_UNAVAILABLE_MESSAGE}</p>
        </div>
      )}

      {available && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2" role="status" aria-live="polite">
            <span className="text-sm font-medium">Status:</span>
            {!statusLoaded && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Checking
              </span>
            )}
            {statusLoaded && keyStatus.saved && (
              <span className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                Key saved
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{keyStatus.masked}</code>
              </span>
            )}
            {statusLoaded && !keyStatus.saved && (
              <span className="text-sm text-muted-foreground">No key saved. AI features stay off until you add one.</span>
            )}
          </div>

          {showKeyField && (
            <div className="space-y-2">
              <Label htmlFor="openai-api-key">{keyStatus.saved ? 'Replacement key' : 'API key'}</Label>
              <Input
                id="openai-api-key"
                type="password"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                placeholder="sk-..."
                autoComplete="off"
                spellCheck={false}
                aria-describedby="openai-api-key-hint"
              />
              <p id="openai-api-key-hint" className="text-xs text-muted-foreground">
                Create a key in the OpenAI console, under API keys. Notara clears this field once the key is stored.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {showKeyField && (
              <Button
                onClick={handleSaveKey}
                disabled={pending !== null || !keyInput.trim()}
                loading={pending === 'save'}
                loadingLabel="Saving the API key"
                className="gap-2"
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" /> {keyStatus.saved ? 'Save replacement' : 'Save key'}
              </Button>
            )}

            {showKeyField && keyStatus.saved && (
              <Button
                variant="ghost"
                onClick={() => {
                  setReplacing(false);
                  setKeyInput('');
                }}
                disabled={pending !== null}
              >
                Cancel
              </Button>
            )}

            {keyStatus.saved && !replacing && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleTestKey}
                  disabled={pending !== null}
                  loading={pending === 'test'}
                  loadingLabel="Testing the connection"
                >
                  Test connection
                </Button>
                <Button variant="outline" onClick={() => setReplacing(true)} disabled={pending !== null}>
                  Replace key
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={pending !== null}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete key
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <Separator />

      <div className="space-y-1">
        <Label>Models</Label>
        <p className="text-sm text-muted-foreground">
          Notara only offers models it has been tested against, and it never switches models for you after a failed
          request.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="openai-text-model">Text model</Label>
          <Select value={textModel} onValueChange={(value) => handleModelChange({ textModel: value as TextModel })}>
            <SelectTrigger id="openai-text-model">
              <SelectValue placeholder="Select a text model" />
            </SelectTrigger>
            <SelectContent>
              {TEXT_MODELS.map((model) => (
                <SelectItem key={model} value={model}>
                  <span className="font-mono text-sm">{model}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="openai-image-model">Image model</Label>
          <Select value={imageModel} onValueChange={(value) => handleModelChange({ imageModel: value as ImageModel })}>
            <SelectTrigger id="openai-image-model">
              <SelectValue placeholder="Select an image model" />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_MODELS.map((model) => (
                <SelectItem key={model} value={model}>
                  <span className="font-mono text-sm">{model}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            GPT Image models need a verified OpenAI organization. Notara reports that plainly if a request is refused.
          </p>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the saved API key?</AlertDialogTitle>
            <AlertDialogDescription>
              Notara removes the encrypted key from this computer. AI features stop working until you add a key again.
              Your key stays valid in the OpenAI console, so this does not revoke it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending === 'delete'}>Keep the key</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteKey();
              }}
              disabled={pending === 'delete'}
            >
              Delete key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
