'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { ref, onValue, push, remove, set } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { FileIcon } from '@/components/file-icon';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { summarizeText } from '@/ai/flows/summarize-text';
import { extractMetadata } from '@/ai/flows/extract-metadata';
import { Copy, Download, Loader2, LogOut, Sparkles, Trash2, Info } from 'lucide-react';

interface TextItem {
  id: string;
  content: string;
  timestamp: number;
}

interface FileItem {
  name: string;
  fullPath: string;
  url: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const [texts, setTexts] = useState<TextItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [textInput, setTextInput] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [aiResult, setAiResult] = useState({ title: '', content: '' });
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const fetchTexts = useCallback((uid: string) => {
    const textsRef = ref(db, `users/${uid}/texts`);
    onValue(textsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedTexts: TextItem[] = data ? Object.entries(data).map(([id, value]: [string, any]) => ({
        id,
        ...value,
      })).sort((a, b) => b.timestamp - a.timestamp) : [];
      setTexts(loadedTexts);
    });
  }, []);

  const fetchFiles = useCallback(async (uid: string) => {
    const filesRef = storageRef(storage, `users/${uid}/files`);
    const res = await listAll(filesRef);
    const filesData = await Promise.all(res.items.map(async (itemRef) => {
      const url = await getDownloadURL(itemRef);
      return {
        name: itemRef.name,
        fullPath: itemRef.fullPath,
        url,
      };
    }));
    setFiles(filesData);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        fetchTexts(user.uid);
        fetchFiles(user.uid);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, fetchTexts, fetchFiles]);
  
  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleAddText = async () => {
    if (!textInput.trim() || !user) return;
    const textsRef = ref(db, `users/${user.uid}/texts`);
    const newTextRef = push(textsRef);
    await set(newTextRef, {
      content: textInput,
      timestamp: Date.now(),
    });
    setTextInput('');
    toast({ title: 'Text saved!' });
  };

  const handleDeleteText = async (textId: string) => {
    if (!user) return;
    const textRef = ref(db, `users/${user.uid}/texts/${textId}`);
    await remove(textRef);
    toast({ title: 'Text deleted.' });
  };
  
  const handleFileUpload = async () => {
    if (!fileInput || !user) return;
    setUploading(true);
    const fileRef = storageRef(storage, `users/${user.uid}/files/${fileInput.name}`);
    try {
      await uploadBytes(fileRef, fileInput);
      await fetchFiles(user.uid);
      toast({ title: 'File uploaded successfully!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload failed', description: (error as Error).message });
    } finally {
      setFileInput(null);
      setUploading(false);
    }
  };
  
  const handleDeleteFile = async (filePath: string) => {
    if (!user) return;
    const fileRef = storageRef(storage, filePath);
    try {
      await deleteObject(fileRef);
      await fetchFiles(user.uid);
      toast({ title: 'File deleted.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Deletion failed', description: (error as Error).message });
    }
  };
  
  const handleSummarize = async (text: string) => {
    setSummarizing(true);
    setIsAiModalOpen(true);
    try {
      const result = await summarizeText({ text });
      setAiResult({ title: 'Summary', content: result.summary });
    } catch (error) {
       setAiResult({ title: 'Error', content: 'Could not generate summary.' });
    } finally {
      setSummarizing(false);
    }
  }

  const toDataURL = (url: string): Promise<string> =>
    fetch(url)
      .then(response => response.blob())
      .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      }));

  const handleExtractMetadata = async (fileUrl: string) => {
    setExtracting(true);
    setIsAiModalOpen(true);
    try {
      const dataUri = await toDataURL(fileUrl);
      const result = await extractMetadata({ fileDataUri: dataUri });
      setAiResult({ title: 'Extracted Metadata', content: result.metadata });
    } catch (error) {
      setAiResult({ title: 'Error', content: 'Could not extract metadata.' });
    } finally {
      setExtracting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <h1 className="text-xl font-bold">Cross Device File Handoff</h1>
          </div>
          <Skeleton className="h-10 w-24" />
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
            <Card>
              <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
              <CardContent><Skeleton className="h-40 w-full" /></CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <h1 className="text-xl font-bold text-foreground">Cross Device File Handoff</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
          <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto p-4 md:p-6 lg:p-8 h-full">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Create & Upload</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <Tabs defaultValue="text" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">Add Text</TabsTrigger>
                  <TabsTrigger value="file">Upload File</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="flex-1 flex flex-col gap-2 mt-4">
                  <Textarea
                    placeholder="Type your text here..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="flex-1 text-base"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddText} className="flex-1">Save Text</Button>
                    <Button variant="outline" onClick={() => handleSummarize(textInput)} disabled={!textInput.trim()}>
                      <Sparkles className="mr-2 h-4 w-4" /> Summarize
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="file" className="mt-4">
                  <div className="space-y-4">
                    <Input type="file" onChange={(e) => setFileInput(e.target.files?.[0] || null)} />
                    <Button onClick={handleFileUpload} disabled={!fileInput || uploading} className="w-full">
                      {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Upload File
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Your Items</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
                <Tabs defaultValue="texts" className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="texts">Texts</TabsTrigger>
                        <TabsTrigger value="files">Files</TabsTrigger>
                    </TabsList>
                    <ScrollArea className="flex-1 mt-4">
                        <TabsContent value="texts" className="m-0">
                            {texts.length > 0 ? (
                                <div className="space-y-4">
                                    {texts.map((text) => (
                                        <Alert key={text.id}>
                                            <AlertDescription className="flex justify-between items-start gap-4">
                                                <p className="flex-1 break-all pt-1">{text.content}</p>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(text.content).then(() => toast({title: 'Copied to clipboard!'}))}><Copy className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleSummarize(text.content)}><Sparkles className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteText(text.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </AlertDescription>
                                        </Alert>
                                    ))}
                                </div>
                            ) : (<p className="text-muted-foreground text-center p-8">No texts saved yet.</p>)}
                        </TabsContent>
                        <TabsContent value="files" className="m-0">
                             {files.length > 0 ? (
                                <div className="space-y-4">
                                    {files.map((file) => (
                                        <Alert key={file.fullPath}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <FileIcon filename={file.name} />
                                                    <span className="font-medium break-all">{file.name}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <a href={file.url} target="_blank" rel="noopener noreferrer" download={file.name}><Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button></a>
                                                    <Button variant="ghost" size="icon" onClick={() => handleExtractMetadata(file.url)}><Info className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteFile(file.fullPath)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                        </Alert>
                                    ))}
                                </div>
                             ) : (<p className="text-muted-foreground text-center p-8">No files uploaded yet.</p>)}
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {(summarizing || extracting) ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5 text-primary" />}
              {(summarizing || extracting) ? 'Generating...' : aiResult.title}
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-h-[60vh] overflow-y-auto whitespace-pre-wrap p-1">
              {aiResult.content}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
