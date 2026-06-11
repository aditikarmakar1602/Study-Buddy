import React, { useState, useEffect, useRef } from 'react';
import api from '../../axios';
import { useAuthStore } from '../store/useAuthStore';

interface Document {
  _id: string;
  title: string;
  fileName: string;
  status: string;
  createdAt: string;
}

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const token = useAuthStore((state: any) => state.token) || localStorage.getItem('token');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Poll for updates if any document is currently processing
  useEffect(() => {
    const hasProcessing = documents.some(doc => doc.status === 'processing');
    if (!hasProcessing) return;

    const intervalId = setInterval(() => {
      fetchDocuments();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(intervalId);
  }, [documents]);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents');
      console.log('[DEBUG Frontend] Fetched documents list:', res.data);
      setDocuments(res.data);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files are allowed.');
        return;
      }
      
      setFile(selectedFile);
      setError('');
      if (!title) {
        setTitle(selectedFile.name.replace('.pdf', ''));
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];

      if (droppedFile.type !== 'application/pdf' && !droppedFile.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files are allowed.');
        return;
      }

      setFile(droppedFile);
      setError('');
      if (!title) setTitle(droppedFile.name.replace('.pdf', ''));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    // Append text fields BEFORE the file so Multer can read them sequentially
    formData.append('title', title || file.name);
    formData.append('file', file);

    console.log('[DEBUG Frontend] Initiating upload...', { fileName: file.name, fileSize: file.size, fileType: file.type });

    setIsUploading(true);
    setError('');

    try {
      const response = await api.post('/documents/upload', formData, {
        timeout: 300000, // 5 minutes timeout for large files
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('[DEBUG Frontend] Upload successful.', response.data);
      setFile(null);
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocuments();
    } catch (err: any) {
      console.error('[DEBUG Frontend] Upload Failed:', err.message);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await api.delete(`/documents/${id}`);
      fetchDocuments(); // Refresh the UI list
    } catch (err) {
      console.error('Failed to delete document', err);
      setError('Failed to delete document.');
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-5xl mx-auto space-y-8 mt-12 md:mt-0 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-textPrimary">Knowledge Base</h1>
        <p className="text-textSecondary text-lg">Upload your study materials to train your personal AI assistant.</p>
      </div>

      <div className="bg-surface border border-card p-6 md:p-8 rounded-3xl shadow-xl">
        {error && <div className="mb-6 text-danger text-sm bg-danger/10 border border-danger/20 p-4 rounded-xl font-medium">{error}</div>}
        
        <form onSubmit={handleUpload} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-textSecondary mb-2 uppercase tracking-wider">Document Title</label>
            <input
              type="text"
              className="w-full px-5 py-4 bg-background border border-card rounded-xl text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Chapter 4: Photosynthesis"
            />
          </div>
          
          <div 
            className={`relative group flex justify-center px-6 pt-12 pb-14 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
              dragActive ? 'border-primary bg-primary/5' : 'border-card bg-background hover:border-primary/50'
            }`}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          >
              <div className="space-y-3 text-center pointer-events-none">
                <div className={`mx-auto h-14 w-14 transition-colors ${file ? 'text-primary' : 'text-muted'}`}>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                </div>
                <div className="flex flex-col text-sm text-textSecondary">
                  <label className="relative cursor-pointer rounded-md font-bold text-primary hover:text-primary-hover focus-within:outline-none pointer-events-auto">
                    <span>{file ? file.name : 'Click to select a file'}</span>
                    <input type="file" accept="application/pdf" onChange={handleFileChange} ref={fileInputRef} className="sr-only" tabIndex={0} />
                  </label>
                  {!file && <p className="mt-1">or drag and drop here</p>}
                </div>
                <p className="text-xs text-muted font-medium">Upload PDF files</p>
              </div>
          </div>

          <button
            type="submit"
            disabled={!file || isUploading}
            className="w-full md:w-auto px-10 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary shadow-lg"
          >
            {isUploading ? 'Processing Document...' : 'Train AI Assistant'}
          </button>
        </form>
      </div>

      <div className="bg-surface border border-card p-6 md:p-8 rounded-3xl shadow-xl mt-8">
        <h2 className="text-xl font-bold text-textPrimary mb-6 border-b border-card pb-4">Your Library</h2>
        {documents.length === 0 ? (
          <p className="text-muted text-center py-8">No documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-card">
            {documents.map((doc) => (
              <li key={doc._id} className="py-5 flex justify-between items-center hover:bg-card/50 rounded-xl px-4 transition-colors -mx-4">
                <div>
                  <p className="font-bold text-textPrimary text-lg">{doc.title}</p>
                  <p className="text-sm text-muted mt-1">{new Date(doc.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full ${
                    doc.status === 'ready' ? 'bg-success/10 text-success border border-success/20' : 
                    doc.status === 'error' ? 'bg-danger/10 text-danger border border-danger/20' : 
                    'bg-warning/10 text-warning border border-warning/20 animate-pulse'
                  }`}>
                    {doc.status}
                  </span>
                  <button onClick={() => handleDelete(doc._id)} className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors" title="Delete Document">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}