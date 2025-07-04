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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { FileIcon } from '@/components/file-icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download, Loader2, LogOut, Trash2, Info, User as UserIcon, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
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
import { ThemeSwitcher } from '@/components/theme-switcher';

interface TextItem {
  id: string;
  heading: string;
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
  
  const [headingInput, setHeadingInput] = useState('');
  const [contentInput, setContentInput] = useState('');

  const [fileInput, setFileInput] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [selectedText, setSelectedText] = useState<TextItem | null>(null);
  const [isTextDetailOpen, setIsTextDetailOpen] = useState(false);

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'text' | 'file'; id: string } | null>(null);


  // Effect for handling authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        // No redirect, show welcome message
      }
    });
    return () => unsubscribe();
  }, [router]);
  
  const fetchFiles = useCallback(async (uid: string) => {
    try {
      const filesStorageRef = storageRef(storage, `users/${uid}/files`);
      const res = await listAll(filesStorageRef);
      const filesData = await Promise.all(res.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return {
          name: itemRef.name,
          fullPath: itemRef.fullPath,
          url,
        };
      }));
      setFiles(filesData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error loading files:", error)
      toast({ variant: 'destructive', title: 'Error loading files', description: (error as Error).message });
    }
  }, [toast]);
  
  // Effect for fetching user data when user is authenticated
  useEffect(() => {
    if (user) {
      fetchFiles(user.uid);
  
      const textsRef = ref(db, `users/${user.uid}/texts`);
      const unsubscribeTexts = onValue(textsRef, (snapshot) => {
        const data = snapshot.val();
        const loadedTexts: TextItem[] = data ? Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value,
        })).sort((a, b) => b.timestamp - a.timestamp) : [];
        setTexts(loadedTexts);
      }, (error) => {
        console.error("Error loading texts:", error);
        toast({ variant: 'destructive', title: 'Error loading texts', description: error.message });
      });
  
      return () => {
        unsubscribeTexts();
      };
    } else {
      setTexts([]);
      setFiles([]);
    }
  }, [user, toast, fetchFiles]);
  
  const handleSignOut = async () => {
    await signOut(auth);
    toast({ title: 'Signed out successfully.' });
  };

  const handleAddText = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!headingInput.trim() || !contentInput.trim()) return;

    const textsRef = ref(db, `users/${user.uid}/texts`);
    const newTextRef = push(textsRef);
    try {
      await set(newTextRef, {
        heading: headingInput,
        content: contentInput,
        timestamp: Date.now(),
      });
      setHeadingInput('');
      setContentInput('');
      toast({ title: 'Text saved!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error saving text', description: (error as Error).message });
    }
  };

  const handleDeleteText = async (textId: string) => {
    if (!user) return;
    const textRef = ref(db, `users/${user.uid}/texts/${textId}`);
    try {
      await remove(textRef);
      toast({ title: 'Text deleted.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error deleting text', description: (error as Error).message });
    }
  };
  
  const handleFileUpload = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!fileInput) return;
    setUploading(true);
    
    const originalName = fileInput.name;
    const lastDotIndex = originalName.lastIndexOf('.');
    
    const nameWithoutExtension = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
    const extension = lastDotIndex !== -1 ? originalName.substring(lastDotIndex) : '';
    
    const newFileName = nameWithoutExtension.substring(0, 10) + extension;
    
    const fileRef = storageRef(storage, `users/${user.uid}/files/${newFileName}`);
    try {
      await uploadBytes(fileRef, fileInput);
      await fetchFiles(user.uid);
      toast({ title: 'File uploaded successfully!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload failed', description: (error as Error).message });
    } finally {
      const fileInputEl = document.getElementById('file-upload-input') as HTMLInputElement;
      if (fileInputEl) fileInputEl.value = '';
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

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !user) return;

    if (itemToDelete.type === 'text') {
      await handleDeleteText(itemToDelete.id);
    } else {
      await handleDeleteFile(itemToDelete.id);
    }
    setItemToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <h1 className="text-xl font-bold">CrossWire</h1>
          </div>
          <Skeleton className="h-10 w-24" />
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted overflow-x-hidden">
      <header className="flex items-center justify-between p-4 border-b shrink-0 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <Logo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground">CrossWire</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeSwitcher />
          <Button variant="link" className="hidden sm:inline-flex" onClick={() => setIsAboutDialogOpen(true)}>
            About
          </Button>
          <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setIsAboutDialogOpen(true)} aria-label="About">
            <Info className="h-5 w-5" />
          </Button>
          {user ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
              <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => router.push('/login')} variant="outline" className="hidden sm:inline-flex">
                <UserIcon className="mr-2 h-4 w-4" />
                Sign In
              </Button>
              <Button onClick={() => router.push('/login')} variant="ghost" size="icon" className="sm:hidden" aria-label="Sign In">
                  <UserIcon className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 lg:p-8">
        {!user ? (
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-lg animate-in fade-in-50 duration-500">
              <CardHeader className="text-center p-6 sm:p-8">
                <CardTitle className="text-3xl sm:text-4xl font-headline tracking-tight">Welcome to CrossWire!</CardTitle>
                <CardDescription className="text-base sm:text-lg text-muted-foreground mt-2">
                  Your simple bridge between devices.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-base font-roboto p-6 sm:p-8 pt-0">
                <p className="mb-6 text-center">
                  Ever wanted to send a link, a note, or a file from your phone to your computer (or the other way around) without the hassle of emailing it to yourself? CrossWire makes it simple.
                </p>
                <div className="bg-accent/50 rounded-lg p-4 mb-6">
                    <ul className="list-none space-y-3">
                      <li className="flex items-start">
                        <span className="text-primary mr-3 mt-1">✔</span>
                        <span>
                          <strong>Send Text:</strong> Instantly share notes and links across all your logged-in devices.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary mr-3 mt-1">✔</span>
                        <span>
                           <strong>Transfer Files:</strong> Quickly move photos, documents, and other files without needing a cable.
                        </span>
                      </li>
                       <li className="flex items-start">
                        <span className="text-primary mr-3 mt-1">✔</span>
                        <span>
                           <strong>Private & Secure:</strong> Everything you save is securely tied to your personal account.
                        </span>
                      </li>
                    </ul>
                </div>
                <div className="text-center">
                  <Button onClick={() => router.push('/login')} size="lg" className="shadow">
                    <UserIcon className="mr-2 h-5 w-5" />
                    Sign In or Create Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto animate-in fade-in-50 duration-500">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Create & Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="text">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text">Add Text</TabsTrigger>
                    <TabsTrigger value="file">Upload File</TabsTrigger>
                  </TabsList>
                  <TabsContent value="text" className="mt-4">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="heading">Heading</Label>
                        <Input id="heading" placeholder="A short, descriptive heading..." value={headingInput} onChange={(e) => setHeadingInput(e.target.value)} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea id="content" placeholder="Type your text here..." value={contentInput} onChange={(e) => setContentInput(e.target.value)} className="text-sm min-h-[120px]" required />
                      </div>
                      <Button onClick={handleAddText} disabled={!headingInput.trim() || !contentInput.trim()}>Save Text</Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="file" className="mt-4">
                    <div className="space-y-4">
                      <Input id="file-upload-input" type="file" onChange={(e) => setFileInput(e.target.files?.[0] || null)} />
                      <Button onClick={handleFileUpload} disabled={!fileInput || uploading} className="w-full">
                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Upload File
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Your Items</CardTitle>
              </CardHeader>
              <CardContent>
                  <Tabs defaultValue="texts">
                      <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="texts">Texts ({texts.length})</TabsTrigger>
                          <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
                      </TabsList>
                      <div className="mt-4">
                          <TabsContent value="texts" className="m-0">
                            <ScrollArea className="h-[350px] w-full">
                              {texts.length > 0 ? (
                                  <div className="space-y-2 pr-4">
                                      {texts.map((text) => (
                                          <div key={text.id} className="flex justify-between items-center gap-4 p-3 rounded-lg border transition-colors hover:bg-accent">
                                              <p className="flex-1 font-medium text-sm text-foreground truncate">{text.heading}</p>
                                              <div className="flex gap-1">
                                                  <Button variant="ghost" size="icon" onClick={() => { setSelectedText(text); setIsTextDetailOpen(true); }}><Eye className="h-4 w-4" /></Button>
                                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { setItemToDelete({ type: 'text', id: text.id }); setIsConfirmDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                <div className="flex items-center justify-center h-[350px]">
                                  <p className="text-muted-foreground text-center">No texts saved yet.</p>
                                </div>
                              )}
                            </ScrollArea>
                          </TabsContent>
                          <TabsContent value="files" className="m-0">
                               <ScrollArea className="h-[350px] w-full">
                                  {files.length > 0 ? (
                                      <div className="space-y-2 pr-4">
                                          {files.map((file) => (
                                              <div key={file.fullPath} className="flex justify-between items-center gap-4 p-3 rounded-lg border transition-colors hover:bg-accent">
                                                  <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                                                      <FileIcon filename={file.name} />
                                                      <span className="font-medium text-sm text-foreground truncate">{file.name}</span>
                                                  </div>
                                                  <div className="flex gap-1 shrink-0">
                                                      <a href={file.url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></a>
                                                      <a href={file.url} target="_blank" rel="noopener noreferrer" download={file.name}><Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button></a>
                                                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { setItemToDelete({ type: 'file', id: file.fullPath }); setIsConfirmDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                    <div className="flex items-center justify-center h-[350px]">
                                      <p className="text-muted-foreground text-center">No files uploaded yet.</p>
                                    </div>
                                  )}
                               </ScrollArea>
                          </TabsContent>
                      </div>
                  </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Dialog open={isAboutDialogOpen} onOpenChange={setIsAboutDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>About CrossWire</DialogTitle>
          </DialogHeader>
          <div className="font-roboto space-y-4 py-4 text-sm text-foreground">
            <p>
              CrossWire makes it easy to share text and files between your different devices, like your phone and computer.
            </p>
            <p>
              <strong>How it works:</strong> Log in on any device. Anything you save here will instantly appear on your other devices. Think of it as a shared clipboard for everything you use.
            </p>
            <div className="pt-4 text-center text-xs text-muted-foreground">
              <p>Developed with ❤️ by</p>
              <p className="font-semibold text-foreground">Mask Solutions</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsAboutDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isTextDetailOpen} onOpenChange={setIsTextDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedText?.heading}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh] pr-4 my-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                  {selectedText?.content}
              </p>
          </ScrollArea>
          <DialogFooter className="sm:justify-start gap-2">
              <Button type="button" onClick={() => {
                  if (selectedText) {
                      navigator.clipboard.writeText(selectedText.content)
                          .then(() => toast({ title: 'Copied to clipboard!' }))
                  }
              }}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Content
              </Button>
              <DialogClose asChild>
                  <Button type="button" variant="secondary">Close</Button>
              </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={(open) => {
        setIsConfirmDeleteDialogOpen(open);
        if (!open) {
          setItemToDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your {itemToDelete?.type === 'text' ? 'text snippet' : 'file'} and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
