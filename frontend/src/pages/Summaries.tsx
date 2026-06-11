import React, { useState, useEffect } from 'react';
import api from '../../axios';
import { useAuthStore } from '../store/useAuthStore';
import jsPDF from 'jspdf';

interface Document { _id: string; title: string; }
interface Summary {
  shortSummary: string;
  detailedSummary: string;
  keyPoints: string[];
  examNotes: string[];
}

export default function Summaries() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [saveToAccount, setSaveToAccount] = useState(true);
  const token = useAuthStore((state: any) => state.token) || localStorage.getItem('token');

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await api.get('/documents');
        setDocuments(res.data);
      } catch (err) {
        console.error('Failed to fetch documents', err);
      }
    };
    fetchDocuments();
  }, []);

  const handleSelectDocument = async (doc: Document) => {
    setSelectedDoc(doc);
    setSummary(null);
    setError('');
    setIsLoading(true);
    try {
      const res = await api.get(`/summaries/${doc._id}`);
      setSummary(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setSummary(null); // Explicitly clear old data
      } else {
        setError('An error occurred while fetching the summary.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedDoc) return;
    setError('');
    setIsLoading(true);
    setIsStreaming(true);
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || api.defaults.baseURL || 'http://localhost:5000/api/v1';
      const authHeader = token ? `Bearer ${token}` : ((api.defaults.headers.common['Authorization'] as string) || '');

      const response = await fetch(`${baseURL}/summaries/${selectedDoc._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({ save: saveToAccount })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || errData?.message || `HTTP Error ${response.status}`);
      }

      if (!response.body) throw new Error('ReadableStream not supported.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      let streamFinished = false;
      while (!streamFinished) {
        const { done, value } = await reader.read();
        if (done) {
          streamFinished = true;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || ''; 

        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const dataStr = part.replace('data: ', '');
            if (dataStr === '[DONE]') {
              streamFinished = true;
              break;
            }
            
            let parsed;
            try {
              parsed = JSON.parse(dataStr);
            } catch (e) {
              continue;
            }

            if (parsed.type === 'chunk') {
              // We ignore raw JSON chunks here to prevent the UI from displaying code
            } else if (parsed.type === 'result') {
              setSummary(parsed.data);
            } else if (parsed.type === 'error') {
              throw new Error(parsed.data);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[DEBUG Frontend] Summary generation error:', err.message);
      const errorMsg = err.message || '';
      if (errorMsg.toLowerCase().includes('rate limit') || errorMsg.includes('429')) {
        setError('AI service is currently busy. Your request has been queued and will automatically retry.');
      } else if (errorMsg.includes('timeout')) {
        setError('Request timed out. The document is too large. Try again.');
      } else {
        setError(errorMsg || 'Failed to generate summary. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleExportPdf = () => {
    if (!summary || !selectedDoc) return;

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let yPosition = margin;
    let pageNumber = 1;

    const addHeaderFooter = () => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(30, 64, 175);
      pdf.text("StudyBuddy AI - Summary", margin, yPosition);
      yPosition += 8;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Document: ${selectedDoc.title}`, margin, yPosition);
      yPosition += 5;
      const dateStr = new Date().toLocaleString();
      pdf.text(`Exported: ${dateStr}`, margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(8);
      pdf.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    };

    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        pdf.addPage();
        pageNumber++;
        yPosition = margin;
        addHeaderFooter();
      }
    };

    addHeaderFooter();

    const addSectionTitle = (title: string) => {
      checkPageBreak(15);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 64, 175);
      pdf.text(title, margin, yPosition);
      yPosition += 8;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);
    };

    if (summary.shortSummary) {
      addSectionTitle("Abstract");
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 65, 85);
      const textLines = pdf.splitTextToSize(summary.shortSummary, contentWidth);
      for (const line of textLines) {
        checkPageBreak(7);
        pdf.text(line, margin, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }

    if (summary.detailedSummary) {
      addSectionTitle("Detailed Synthesis");
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 65, 85);
      const textLines = pdf.splitTextToSize(summary.detailedSummary, contentWidth);
      for (const line of textLines) {
        checkPageBreak(7);
        pdf.text(line, margin, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }

    if (summary.keyPoints && summary.keyPoints.length > 0) {
      addSectionTitle("Key Takeaways");
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 65, 85);
      for (const point of summary.keyPoints) {
        const pLines = pdf.splitTextToSize(`• ${point}`, contentWidth);
        for (const line of pLines) {
          checkPageBreak(7);
          pdf.text(line, margin, yPosition);
          yPosition += 5;
        }
        yPosition += 2;
      }
      yPosition += 5;
    }
    
    if (summary.examNotes && summary.examNotes.length > 0) {
      addSectionTitle("Exam Notes");
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 65, 85);
      for (const note of summary.examNotes) {
        const nLines = pdf.splitTextToSize(`• ${note}`, contentWidth);
        for (const line of nLines) {
          checkPageBreak(7);
          pdf.text(line, margin, yPosition);
          yPosition += 5;
        }
        yPosition += 2;
      }
    }

    pdf.save(`${selectedDoc.title.replace(/ /g, '_')}_Summary.pdf`);
  };

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 h-full animate-fade-in mt-12 md:mt-0">
      <div className="w-full lg:w-1/3 bg-surface rounded-3xl shadow-lg border border-card p-6 lg:p-8 max-h-[400px] lg:max-h-none lg:h-[600px] overflow-y-auto custom-scrollbar flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-textPrimary">Select Document</h2>
        <ul className="space-y-3 flex-1">
          {documents.map((doc) => (
            <li key={doc._id} className={`p-5 border rounded-2xl cursor-pointer transition-all ${selectedDoc?._id === doc._id ? 'border-primary bg-primary/10 shadow-md' : 'border-card bg-background hover:border-primary/50'}`} onClick={() => handleSelectDocument(doc)}>
              <p className="font-bold text-textPrimary truncate">{doc.title}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className={`w-full lg:w-2/3 bg-surface rounded-3xl shadow-lg border border-card p-6 lg:p-8 min-h-[500px] lg:h-[600px] overflow-y-auto custom-scrollbar flex flex-col ${(!selectedDoc || isLoading || !summary) ? 'items-center justify-center' : ''}`}>
        {!selectedDoc ? (
          <p className="text-muted text-lg">Select a document to view or generate its summary.</p>
        ) : isLoading ? (
          <div className="flex flex-col items-center space-y-6 text-primary w-full max-w-2xl mx-auto">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="font-bold uppercase tracking-widest animate-pulse">Generating Summary...</span>
          </div>
        ) : summary ? (
          <div className="w-full space-y-8 animate-fade-in text-left">
            {error && <div className="text-danger bg-danger/10 border border-danger/20 p-4 rounded-xl font-bold">{error}</div>}
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-textPrimary tracking-tight">Document Summary</h2>
              <button onClick={handleExportPdf} className="px-4 py-2 md:px-6 md:py-3 bg-primary text-white rounded-xl hover:bg-primary-hover font-bold transition-all shadow-md text-sm md:text-base">Save as PDF</button>
            </div>
            <section>
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Abstract</h3>
              <p className="text-textSecondary leading-relaxed text-lg">{summary.shortSummary}</p>
            </section>
            <section>
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Detailed Synthesis</h3>
              <p className="text-textSecondary leading-relaxed bg-background p-6 rounded-2xl whitespace-pre-wrap border border-card">{summary.detailedSummary}</p>
            </section>
            <section>
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Key Takeaways</h3>
              <div className="grid gap-3">
                {summary.keyPoints?.map((point, i) => (
                  <div key={i} className="flex items-start space-x-4 bg-background p-5 rounded-xl border border-card shadow-sm"><div className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0"></div><p className="text-textPrimary font-medium">{point}</p></div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="text-center animate-fade-in max-w-md">
            <h3 className="text-2xl font-black text-textPrimary mb-4">No Summary Found</h3>
            <p className="text-textSecondary text-lg mb-8 leading-relaxed">Let AI extract the most important information from "{selectedDoc.title}".</p>
            {error && <p className="text-danger bg-danger/10 border border-danger/20 p-4 rounded-xl mb-6 font-bold">{error}</p>}
            <div className="flex items-center justify-center space-x-3 mb-6">
              <input type="checkbox" id="saveSummary" checked={saveToAccount} onChange={e => setSaveToAccount(e.target.checked)} className="w-5 h-5 text-primary bg-background border-card rounded focus:ring-primary focus:ring-2 cursor-pointer" />
              <label htmlFor="saveSummary" className="text-sm font-bold text-textSecondary cursor-pointer select-none">Save to my account</label>
            </div>
            <button 
              onClick={handleGenerateSummary} 
              disabled={isLoading || isStreaming} 
              className="px-8 py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-hover hover:-translate-y-1 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isStreaming ? 'Generating...' : 'Generate with AI'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}