import React, { useEffect, useRef, useState } from 'react';
import { useNotes } from '@/context/NotesContextTypes';
import { Note, NoteTag } from '@/types';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { calculateNoteSimilarity } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface NodePosition {
  id: string;
  x: number;
  y: number;
  type: 'note' | 'tag';
  name: string;
  color?: string;
  radius: number;
}

interface Connection {
  source: string;
  target: string;
  type?: 'tag' | 'content';
  strength?: number;
}

const ConstellationView: React.FC = () => {
  const { notes, tags } = useNotes();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<NodePosition[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [hoveredNode, setHoveredNode] = useState<NodePosition | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodePosition | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
  const [showContentConnections, setShowContentConnections] = useState(true);
  const [noteRelationships, setNoteRelationships] = useState<{sourceId: string, targetId: string, strength: number}[]>([]);
  const navigate = useNavigate();

  // Calculate note similarities
  useEffect(() => {
    if (!notes || notes.length < 2) return;

    // Calculate similarities between all notes
    const similarities = calculateNoteSimilarity(notes);

    // Create relationships based on similarity threshold
    const relationships: {sourceId: string, targetId: string, strength: number}[] = [];

    Object.keys(similarities).forEach(sourceId => {
      Object.keys(similarities[sourceId]).forEach(targetId => {
        const strength = similarities[sourceId][targetId];

        if (strength >= similarityThreshold) {
          relationships.push({
            sourceId,
            targetId,
            strength
          });
        }
      });
    });

    setNoteRelationships(relationships);
  }, [notes, similarityThreshold]);

  // Setup nodes and connections
  useEffect(() => {
    if (!notes || !tags) return;

    const positions: NodePosition[] = [];
    const noteConnections: Connection[] = [];

    // Get container dimensions for better positioning
    const container = containerRef.current;
    const containerWidth = container?.clientWidth || window.innerWidth;
    const containerHeight = container?.clientHeight || window.innerHeight;

    // Create positions for tags (stars)
    tags.forEach((tag, index) => {
      const angle = (Math.PI * 2) / tags.length * index;
      const radius = Math.min(containerWidth, containerHeight) / 4; // Reduced radius for better fit

      positions.push({
        id: `tag-${tag.id}`,
        x: Math.cos(angle) * radius + containerWidth / 2,
        y: Math.sin(angle) * radius + containerHeight / 2,
        type: 'tag',
        name: tag.name,
        color: tag.color,
        radius: 8
      });
    });

    // Create positions for notes
    notes.forEach((note) => {
      // Find an optimal position for each note based on its tags
      let x = 0;
      let y = 0;
      const connectedTags = note.tags;

      if (connectedTags.length > 0) {
        // Position the note as an average of its tags positions
        connectedTags.forEach(tag => {
          const tagNode = positions.find(p => p.id === `tag-${tag.id}`);
          if (tagNode) {
            x += tagNode.x;
            y += tagNode.y;

            // Create connection
            noteConnections.push({
              source: `note-${note.id}`,
              target: `tag-${tag.id}`,
              type: 'tag'
            });
          }
        });

        // Calculate average position with some randomness
        x = x / connectedTags.length + (Math.random() - 0.5) * 100;
        y = y / connectedTags.length + (Math.random() - 0.5) * 100;
      } else {
        // If note has no tags, place it randomly within container bounds
        x = Math.random() * containerWidth * 0.6 + containerWidth * 0.2;
        y = Math.random() * containerHeight * 0.6 + containerHeight * 0.2;
      }

      positions.push({
        id: `note-${note.id}`,
        x,
        y,
        type: 'note',
        name: note.title,
        radius: 5
      });
    });

    // Add connections based on content similarity
    if (showContentConnections) {
      noteRelationships.forEach(relationship => {
        noteConnections.push({
          source: `note-${relationship.sourceId}`,
          target: `note-${relationship.targetId}`,
          type: 'content',
          strength: relationship.strength
        });
      });
    }

    setNodes(positions);
    setConnections(noteConnections);
  }, [notes, tags, noteRelationships, showContentConnections]);

  // Handle canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Get current theme colors from CSS variables
    const normalizeHslComponents = (rawValue: string) => {
      const cleaned = rawValue
        .replace(/^hsl\(/i, '')
        .replace(/^hsla\(/i, '')
        .replace(/\)$/g, '')
        .trim();

      if (cleaned.includes(',')) {
        return cleaned;
      }

      const parts = cleaned.split(/\s+/).filter(Boolean);
      if (parts.length >= 3) {
        return `${parts[0]}, ${parts[1]}, ${parts[2]}`;
      }

      return cleaned;
    };

    const getThemeColor = (cssVar: string, opacity: number = 1) => {
      const root = document.documentElement;
      const hslValue = getComputedStyle(root).getPropertyValue(cssVar).trim();

      if (!hslValue) {
        return `rgba(148, 163, 184, ${opacity})`;
      }

      if (hslValue.startsWith('#') || hslValue.startsWith('rgb(') || hslValue.startsWith('rgba(')) {
        return hslValue;
      }

      const normalized = normalizeHslComponents(hslValue);
      return `hsla(${normalized}, ${opacity})`;
    };

    const getThemeSolidColor = (cssVar: string) => {
      const root = document.documentElement;
      const hslValue = getComputedStyle(root).getPropertyValue(cssVar).trim();

      if (!hslValue) {
        return 'rgb(148, 163, 184)';
      }

      if (hslValue.startsWith('#') || hslValue.startsWith('rgb(') || hslValue.startsWith('rgba(')) {
        return hslValue;
      }

      const normalized = normalizeHslComponents(hslValue);
      return `hsl(${normalized})`;
    };

    // Animation function
    const animate = () => {
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      connections.forEach(connection => {
        const source = nodes.find(node => node.id === connection.source);
        const target = nodes.find(node => node.id === connection.target);

        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);

          // Style connections differently based on type
          if (connection.type === 'content') {
            // Content similarity connections - use primary colors with gradient
            const gradient = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
            gradient.addColorStop(0, getThemeColor('--primary', 0.4));
            gradient.addColorStop(1, getThemeColor('--accent', 0.4));
            ctx.strokeStyle = gradient;

            // Line width based on similarity strength
            ctx.lineWidth = (connection.strength || 0.3) * 3;
          } else {
            // Tag connections - use muted color
            ctx.strokeStyle = getThemeColor('--muted-foreground', 0.2);
            ctx.lineWidth = 1;
          }

          // Highlight connections for hovered node
          if (hoveredNode && (hoveredNode.id === source.id || hoveredNode.id === target.id)) {
            ctx.strokeStyle = connection.type === 'content'
              ? getThemeColor('--primary', 0.8)
              : getThemeColor('--muted-foreground', 0.6);
            ctx.lineWidth += 1;
          }

          ctx.stroke();
          ctx.lineWidth = 1; // Reset line width
        }
      });

      // Optional: Draw subtle static background dots
      // (Removed random star field for better performance and theme consistency)

      // Draw nodes
      nodes.forEach(node => {
        const isHovered = hoveredNode && hoveredNode.id === node.id;
        const isSelected = selectedNode && selectedNode.id === node.id;

        ctx.beginPath();

        if (node.type === 'tag') {
          // Draw tag as a star
          const color = node.color || getThemeSolidColor('--primary');
          const glow = isHovered || isSelected ? 20 : 10;

          ctx.shadowBlur = glow;
          ctx.shadowColor = color;
          ctx.fillStyle = color;

          // Draw star shape
          const spikes = 5;
          const outerRadius = node.radius;
          const innerRadius = node.radius / 2;

          let rot = (Math.PI / 2) * 3;
          let x = node.x;
          let y = node.y;
          const step = Math.PI / spikes;

          ctx.beginPath();
          ctx.moveTo(node.x, node.y - outerRadius);

          for (let i = 0; i < spikes; i++) {
            x = node.x + Math.cos(rot) * outerRadius;
            y = node.y + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = node.x + Math.cos(rot) * innerRadius;
            y = node.y + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
          }

          ctx.lineTo(node.x, node.y - outerRadius);
          ctx.closePath();
          ctx.fill();

        } else {
          // Draw note as a circle
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

          if (isHovered || isSelected) {
            const primaryColor = getThemeSolidColor('--primary');
            ctx.fillStyle = primaryColor;
            ctx.shadowBlur = 15;
            ctx.shadowColor = primaryColor;
          } else {
            ctx.fillStyle = getThemeColor('--foreground', 0.8);
          }
        }

        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw labels
        if (isHovered || isSelected) {
          ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillStyle = getThemeColor('--foreground', 1);
          ctx.textAlign = 'center';
          ctx.shadowBlur = 3;
          ctx.shadowColor = getThemeColor('--background', 0.8);
          ctx.fillText(node.name, node.x, node.y + node.radius * 2 + 10);
          ctx.shadowBlur = 0; // Reset shadow
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [nodes, connections, hoveredNode, selectedNode]);

  // Handle mouse interactions
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });

    // Detect hover
    const hovered = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius + 5;
    });

    setHoveredNode(hovered || null);
  };

  const handleClick = () => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode);

      // Handle node click based on type
      if (hoveredNode.type === 'note') {
        const noteId = hoveredNode.id.replace('note-', '');
        navigate(`/note/${noteId}`);
      } else if (hoveredNode.type === 'tag') {
        // Filter notes by tag
        const tagName = hoveredNode.name;
        toast({
          title: `Tag: ${tagName}`,
          description: `Notes with this tag will be highlighted`
        });
      }
    } else {
      setSelectedNode(null);
    }
  };

  // Similarity controls component
  const SimilarityControls = () => (
    <Card className="absolute top-4 right-4 w-64 sm:w-72 bg-card/95 backdrop-blur-md border-border/50 shadow-lg">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5a4 4 0 0 1 7 0"/><path d="M8 12a4 4 0 0 0 8 0"/></svg>
          Content Similarity
        </h3>

        <div className="flex items-center gap-2 mb-4">
          <Switch
            id="show-content-connections"
            checked={showContentConnections}
            onCheckedChange={setShowContentConnections}
          />
          <Label htmlFor="show-content-connections" className="text-sm font-medium">
            Show content connections
          </Label>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Threshold</span>
            <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {(similarityThreshold * 100).toFixed(0)}%
            </span>
          </div>

          <Slider
            value={[similarityThreshold]}
            min={0.1}
            max={0.9}
            step={0.05}
            onValueChange={(value) => setSimilarityThreshold(value[0])}
            className="flex-1"
            disabled={!showContentConnections}
          />

          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary/60"></div>
            {noteRelationships.length} content connections found
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-background overflow-hidden"
      style={{
        backgroundImage: `
          radial-gradient(circle at 25% 25%, hsl(var(--muted)) 1px, transparent 0),
          radial-gradient(circle at 75% 75%, hsl(var(--muted)) 1px, transparent 0)
        `,
        backgroundSize: '100px 100px'
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />
      {/* Page Title */}
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          Constellation View
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Explore the connections between your notes and tags
        </p>
      </div>

      <SimilarityControls />
      
      {/* Instructions */}
      <div className="absolute bottom-4 left-4 right-4 sm:left-4 sm:right-auto sm:max-w-md">
        <div className="bg-card/90 backdrop-blur-sm p-3 rounded-lg border border-border/50 shadow-lg">
          <div className="text-sm space-y-2">
            <p className="font-medium text-foreground flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
              How to explore:
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary/60 flex-shrink-0"></div>
                <span>Stars represent <strong>tags</strong> - click to highlight related notes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-foreground/60 flex-shrink-0 ml-0.5"></div>
                <span>Circles represent <strong>notes</strong> - click to open the note</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConstellationView;
