import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Note } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculates similarity between notes using TF-IDF and cosine similarity
 */
export const calculateNoteSimilarity = (notes: Note[]): Record<string, Record<string, number>> => {
  // Step 1: Tokenize all notes
  const tokenizedNotes = notes.map(note => {
    const tokens = tokenize(note.title + " " + note.content);
    return { id: note.id, tokens };
  });

  // Step 2: Calculate document frequency for each term
  const documentFrequency: Record<string, number> = {};
  tokenizedNotes.forEach(({ tokens }) => {
    const uniqueTokens = new Set(tokens);
    uniqueTokens.forEach(token => {
      documentFrequency[token] = (documentFrequency[token] || 0) + 1;
    });
  });

  // Step 3: Calculate TF-IDF vectors for each note
  const tfidfVectors: Record<string, Record<string, number>> = {};
  const totalDocs = notes.length;

  tokenizedNotes.forEach(({ id, tokens }) => {
    const vector: Record<string, number> = {};
    const termFrequency: Record<string, number> = {};

    // Calculate term frequency
    tokens.forEach(token => {
      termFrequency[token] = (termFrequency[token] || 0) + 1;
    });

    // Calculate TF-IDF for each term
    Object.keys(termFrequency).forEach(term => {
      const tf = termFrequency[term] / tokens.length;
      const idf = Math.log(totalDocs / (documentFrequency[term] || 1));
      vector[term] = tf * idf;
    });

    tfidfVectors[id] = vector;
  });

  // Step 4: Calculate cosine similarity between all note pairs
  const similarities: Record<string, Record<string, number>> = {};

  notes.forEach((noteA, i) => {
    similarities[noteA.id] = {};

    notes.forEach((noteB, j) => {
      if (i !== j) {
        similarities[noteA.id][noteB.id] = cosineSimilarity(
          tfidfVectors[noteA.id],
          tfidfVectors[noteB.id]
        );
      }
    });
  });

  return similarities;
};

/**
 * Tokenizes text into words, removing stopwords and applying stemming
 */
const tokenize = (text: string): string[] => {
  // Convert to lowercase and split by non-alphanumeric characters
  const tokens = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2) // Remove very short words
    .filter(token => !STOPWORDS.includes(token)); // Remove common stopwords

  return tokens;
};

/**
 * Calculates cosine similarity between two vectors
 */
const cosineSimilarity = (
  vectorA: Record<string, number>,
  vectorB: Record<string, number>
): number => {
  // Find all unique terms in both vectors
  const terms = new Set([...Object.keys(vectorA), ...Object.keys(vectorB)]);

  // Calculate dot product
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  terms.forEach(term => {
    const valueA = vectorA[term] || 0;
    const valueB = vectorB[term] || 0;

    dotProduct += valueA * valueB;
    magnitudeA += valueA * valueA;
    magnitudeB += valueB * valueB;
  });

  // Calculate cosine similarity
  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
};

// Common English stopwords to filter out
const STOPWORDS = [
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
  'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them',
  'their', 'we', 'us', 'our', 'you', 'your', 'he', 'him', 'his',
  'she', 'her', 'hers', 'i', 'me', 'my', 'mine', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'from'
];
