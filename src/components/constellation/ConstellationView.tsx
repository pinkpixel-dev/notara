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

    // Create positions for tags (stars)
    tags.forEach((tag, index) => {
      const angle = (Math.PI * 2) / tags.length * index;
      const radius = Math.min(window.innerWidth, window.innerHeight) / 3;

      positions.push({
        id: `tag-${tag.id}`,
        x: Math.cos(angle) * radius + window.innerWidth / 2,
        y: Math.sin(angle) * radius + window.innerHeight / 2,
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
        // If note has no tags, place it randomly
        x = Math.random() * window.innerWidth * 0.6 + window.innerWidth * 0.2;
        y = Math.random() * window.innerHeight * 0.6 + window.innerHeight * 0.2;
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
            // Content similarity connections - purple/blue gradient
            const gradient = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
            gradient.addColorStop(0, 'rgba(155, 135, 245, 0.3)');
            gradient.addColorStop(1, 'rgba(14, 165, 233, 0.3)');
            ctx.strokeStyle = gradient;

            // Line width based on similarity strength
            ctx.lineWidth = (connection.strength || 0.3) * 3;
          } else {
            // Tag connections - default style
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
          }

          // Highlight connections for hovered node
          if (hoveredNode && (hoveredNode.id === source.id || hoveredNode.id === target.id)) {
            ctx.strokeStyle = connection.type === 'content'
              ? 'rgba(155, 135, 245, 0.8)'
              : 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth += 1;
          }

          ctx.stroke();
          ctx.lineWidth = 1; // Reset line width
        }
      });

      // Draw star field background
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.1})`;
        ctx.beginPath();
        ctx.arc(
          Math.random() * canvas.width,
          Math.random() * canvas.height,
          Math.random() * 1 + 0.1,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // Draw nodes
      nodes.forEach(node => {
        const isHovered = hoveredNode && hoveredNode.id === node.id;
        const isSelected = selectedNode && selectedNode.id === node.id;

        ctx.beginPath();

        if (node.type === 'tag') {
          // Draw tag as a star
          const color = node.color || '#9b87f5';
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
            ctx.fillStyle = '#9b87f5';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#9b87f5';
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          }
        }

        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw labels
        if (isHovered || isSelected) {
          ctx.font = '12px Arial';
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.fillText(node.name, node.x, node.y + node.radius * 2 + 10);
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
    <Card className="absolute top-4 right-4 w-64 bg-cosmos-deepspace/80 backdrop-blur-md border-cosmos-nebula/30">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium mb-2">Content Similarity</h3>

        <div className="flex items-center gap-2 mb-3">
          <Switch
            id="show-content-connections"
            checked={showContentConnections}
            onCheckedChange={setShowContentConnections}
          />
          <Label htmlFor="show-content-connections" className="text-xs">
            Show content connections
          </Label>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs">Threshold</span>
            <span className="text-xs w-8 text-right">{(similarityThreshold * 100).toFixed(0)}%</span>
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
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          {noteRelationships.length} content connections found
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-cosmos-deepspace"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />
      <SimilarityControls />
      <div className="absolute bottom-4 left-4 text-sm text-muted-foreground">
        <p>Click on stars (tags) or planets (notes) to explore connections</p>
      </div>
    </div>
  );
};

export default ConstellationView;
