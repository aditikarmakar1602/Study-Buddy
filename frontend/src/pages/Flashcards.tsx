import React, { useState, useEffect } from 'react';
import api from '../../axios';
import { useAuthStore } from '../store/useAuthStore';
import jsPDF from 'jspdf';

interface Document {
  _id: string;
  title: string;
}

interface Card {
  front: string;
  back: string;
  _id: string;
}

interface FlashcardDeck {
  _id: string;
  deckName: string;
  cards: Card[];
}

const FlashcardViewer = ({ deck, onExportAll, isExportingAll }: { deck: FlashcardDeck, onExportAll?: () => void, isExportingAll?: boolean }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // Reset flip state when card changes
    setIsFlipped(false);
  }, [currentIndex]);

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % deck.cards.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + deck.cards.length) % deck.cards.length);

  if (!deck.cards || deck.cards.length === 0) {
    return <p className="text-gray-500">This deck has no flashcards.</p>;
  }

  const currentCard = deck.cards[currentIndex];

  return (
    <div className="w-full max-w-2xl flex flex-col items-center animate-fade-in">
      <h3 className="text-2xl md:text-3xl font-black mb-2 text-textPrimary tracking-tight text-center">{deck.deckName}</h3>
      {onExportAll && (
        <button onClick={onExportAll} disabled={isExportingAll} className="mb-4 text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
          {isExportingAll ? 'Exporting...' : 'Export All Flashcards to PDF'}
        </button>
      )}
      <div
        className="w-full min-h-[300px] md:h-80 flex items-center justify-center rounded-3xl shadow-2xl cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div 
          className="w-full h-full transition-transform duration-500 relative"
          style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          <div 
            className="absolute w-full h-full flex items-center justify-center text-center bg-background border border-card rounded-3xl p-6 md:p-8 shadow-inner overflow-y-auto custom-scrollbar"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-xl md:text-3xl font-bold text-textPrimary leading-snug">{currentCard.front}</p>
          </div>
          <div 
            className="absolute w-full h-full flex items-center justify-center text-center bg-primary/10 border border-primary/30 rounded-3xl p-6 md:p-8 overflow-y-auto custom-scrollbar"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-lg md:text-2xl font-medium text-textPrimary leading-relaxed">{currentCard.back}</p>
          </div>
        </div>
      </div>
      <div className="mt-6 md:mt-8 text-sm font-bold tracking-widest text-muted uppercase">
        Card {currentIndex + 1} <span className="mx-2 text-card">/</span> {deck.cards.length}
      </div>
      <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-4 sm:gap-6 w-full sm:w-auto">
        <button onClick={handlePrev} className="w-full sm:w-auto px-8 py-3 border border-card rounded-xl hover:bg-card text-textPrimary font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary shadow-sm">Previous</button>
        <button onClick={handleNext} className="w-full sm:w-auto px-8 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary shadow-md">Next Card</button>
      </div>
    </div>
  );
};

export default function Flashcards() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExportingAll, setIsExportingAll] = useState(false); // New state for exporting all
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
    setDeck(null);
    setError('');
    setIsLoading(true);
    try {
      const res = await api.get(`/flashcards/${doc._id}`);
      setDeck(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) { // If no deck exists for this doc
        setDeck(null); // Ensure no old deck is shown
      } else { // For other errors (500, etc.)
        setError('An error occurred while fetching flashcards.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!selectedDoc) return;
    setError('');
    setIsLoading(true);
    setIsStreaming(true);
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || api.defaults.baseURL || 'http://localhost:5000/api/v1';
      const authHeader = token ? `Bearer ${token}` : ((api.defaults.headers.common['Authorization'] as string) || '');

      const response = await fetch(`${baseURL}/flashcards/${selectedDoc._id}`, {
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
              setDeck(parsed.data);
            } else if (parsed.type === 'error') {
              throw new Error(parsed.data);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[DEBUG Frontend] Flashcard generation error:', err.message);
      const errorMsg = err.message || '';
      if (errorMsg.toLowerCase().includes('rate limit') || errorMsg.includes('429')) {
        setError('AI service is currently busy. Your request has been queued and will automatically retry.');
      } else if (errorMsg.includes('timeout')) {
        setError('Request timed out. The document is too large. Try again.');
      } else {
        setError(errorMsg || 'Failed to generate flashcards. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleExportAllFlashcards = async () => {
    if (!deck || !deck.cards || deck.cards.length === 0) return;

    setIsExportingAll(true);

    // Small delay to allow React state to render the loading indicator
    await new Promise((resolve) => setTimeout(resolve, 50));

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

    const addHeader = () => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(30, 64, 175); // Primary blue
      pdf.text("StudyBuddy AI - Flashcards", margin, yPosition);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139); // Muted gray
      const dateStr = new Date().toLocaleString();
      pdf.text(`Exported: ${dateStr}`, margin, yPosition + 6);

      pdf.text(`Page ${pageNumber}`, pageWidth - margin, yPosition, { align: "right" });

      yPosition += 15;
      pdf.setDrawColor(203, 213, 224); // line color
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
    };

    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        pdf.addPage();
        pageNumber++;
        yPosition = margin;
        addHeader();
      }
    };

    addHeader();

    // Print Deck Name
    pdf.setFontSize(18);
    pdf.setTextColor(15, 23, 42); // textPrimary
    pdf.setFont("helvetica", "bold");
    const deckNameLines = pdf.splitTextToSize(`Deck: ${deck.deckName}`, contentWidth);
    checkPageBreak(deckNameLines.length * 7 + 10);
    pdf.text(deckNameLines, margin, yPosition);
    yPosition += deckNameLines.length * 7 + 10;

    deck.cards.forEach((card, index) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      const cardTitle = `Flashcard ${index + 1}`;

      pdf.setFontSize(12);
      const qLabel = "Question:";
      pdf.setFont("helvetica", "normal");
      const qText = pdf.splitTextToSize(card.front, contentWidth);

      pdf.setFont("helvetica", "bold");
      const aLabel = "Answer:";
      pdf.setFont("helvetica", "normal");
      const aText = pdf.splitTextToSize(card.back, contentWidth);

      // Estimate block height
      const blockHeight = 8 + 6 + (qText.length * 6) + 6 + (aText.length * 6) + 15;

      checkPageBreak(blockHeight);

      // Render Title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(30, 64, 175);
      pdf.text(cardTitle, margin, yPosition);
      yPosition += 8;

      // Render Question
      pdf.setFontSize(12);
      pdf.setTextColor(15, 23, 42);
      pdf.text(qLabel, margin, yPosition);
      yPosition += 6;
      
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 65, 85);
      pdf.text(qText, margin, yPosition);
      yPosition += qText.length * 6;

      // Render Answer
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text(aLabel, margin, yPosition);
      yPosition += 6;
      
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 65, 85);
      pdf.text(aText, margin, yPosition);
      yPosition += aText.length * 6;

      // Divider
      yPosition += 5;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
    });

    pdf.save(`${deck.deckName.replace(/ /g, '_')}_all_flashcards.pdf`);
    setIsExportingAll(false);
  };

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 h-full animate-fade-in mt-12 md:mt-0">
      <div className="w-full lg:w-1/3 bg-surface rounded-3xl shadow-lg border border-card p-6 lg:p-8 max-h-[400px] lg:max-h-none lg:h-[600px] overflow-y-auto custom-scrollbar flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-textPrimary">Select Deck</h2>
        <ul className="space-y-3 flex-1">
          {documents.map((doc) => (
            <li
              key={doc._id}
              className={`p-5 border rounded-2xl cursor-pointer transition-all ${selectedDoc?._id === doc._id ? 'border-primary bg-primary/10 shadow-md' : 'border-card bg-background hover:border-primary/50'}`}
              onClick={() => handleSelectDocument(doc)}
            >
              <p className="font-bold text-textPrimary truncate">{doc.title}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className={`w-full lg:w-2/3 bg-surface rounded-3xl shadow-lg border border-card p-6 lg:p-8 min-h-[500px] lg:h-[600px] overflow-y-auto custom-scrollbar flex flex-col ${(!selectedDoc || isLoading || !deck) ? 'items-center justify-center' : ''}`}>
        {!selectedDoc ? (
          <p className="text-muted text-lg">Select a document to view or generate flashcards.</p>
        ) : isLoading ? (
          <div className="flex flex-col items-center space-y-6 text-primary w-full max-w-2xl mx-auto">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="font-bold uppercase tracking-widest animate-pulse">Loading Deck...</span>
          </div>
        ) : deck ? (
          <>
            {error && <div className="mb-6 w-full max-w-2xl mx-auto text-danger bg-danger/10 border border-danger/20 p-4 rounded-xl font-bold">{error}</div>}
            <FlashcardViewer deck={deck} onExportAll={handleExportAllFlashcards} isExportingAll={isExportingAll} />
          </>
        ) : (
          <div className="text-center animate-fade-in max-w-md">
            <h3 className="text-2xl font-black text-textPrimary mb-4">No Flashcards Found</h3>
            <p className="text-textSecondary text-lg mb-8 leading-relaxed">Let AI automatically generate a comprehensive study deck for "{selectedDoc.title}".</p>
            {error && <p className="text-danger bg-danger/10 border border-danger/20 p-4 rounded-xl mb-6 font-bold">{error}</p>}
            <div className="flex items-center justify-center space-x-3 mb-6">
              <input type="checkbox" id="saveFlashcards" checked={saveToAccount} onChange={e => setSaveToAccount(e.target.checked)} className="w-5 h-5 text-primary bg-background border-card rounded focus:ring-primary focus:ring-2 cursor-pointer" />
              <label htmlFor="saveFlashcards" className="text-sm font-bold text-textSecondary cursor-pointer select-none">Save to my account</label>
            </div>
            <button
              onClick={handleGenerateFlashcards}
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