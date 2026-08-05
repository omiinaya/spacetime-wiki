import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3Force from 'd3-force';
import * as d3Selection from 'd3-selection';
import { buildGraph } from './graphUtils';
import { api } from '../lib/api';
import { Loader2, Share2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface GraphNode {
  id: string;
  title: string;
  icon: string;
  color: string;
  collectionId: string;
  collectionName: string;
  isCollection: boolean;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string;
  target: string;
  type: 'parent-child' | 'collection' | 'backlink';
}

export default function GraphView() {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<GraphLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [showCollections, setShowCollections] = useState(true);
  const [showParentChild, setShowParentChild] = useState(true);
  const [showBacklinks, setShowBacklinks] = useState(true);
  const [zoom, setZoom] = useState(1);

  // ─── Load data ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [allPages, allCollections] = await Promise.all([
          api.pages.list(),
          api.collections.list(),
        ]);
        if (cancelled) return;

        const { nodes: gNodes, links: gLinks } = buildGraph(allPages, allCollections);

        setGraphNodes(gNodes);
        setGraphLinks(gLinks);
      } catch (e: unknown) {
        setError(e.message || 'Failed to load graph data');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── D3 Force Simulation ──────────────────────────────────────────────

  useEffect(() => {
    if (loading || graphNodes.length === 0 || !svgRef.current) return;
    const svg = d3Selection.select(svgRef.current);
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    svg.selectAll('*').remove();

    let activeLinks = graphLinks;
    if (!showCollections) activeLinks = activeLinks.filter((l) => l.type !== 'collection');
    if (!showParentChild) activeLinks = activeLinks.filter((l) => l.type !== 'parent-child');
    if (!showBacklinks) activeLinks = activeLinks.filter((l) => l.type !== 'backlink');

    const sim: d3Force.Simulation<GraphNode, undefined> = d3Force
      .forceSimulation<GraphNode>(graphNodes)
      .force(
        'link',
        d3Force
          .forceLink<GraphNode, GraphLink>(activeLinks)
          .id((d) => d.id)
          .distance((d) => (d.type === 'collection' ? 80 : 120))
          .strength((d) => (d.type === 'collection' ? 0.3 : 0.6)),
      )
      .force('charge', d3Force.forceManyBody<GraphNode>().strength(-250))
      .force('center', d3Force.forceCenter<GraphNode>(width / 2, height / 2))
      .force('collision', d3Force.forceCollide<GraphNode>().radius(30));
    simulationRef.current = sim;

    // Links
    const linkEls = svg
      .append('g')
      .selectAll('line')
      .data(activeLinks)
      .join('line')
      .attr('stroke', (d) =>
        d.type === 'parent-child' ? '#60a5fa' : d.type === 'backlink' ? '#f59e0b' : '#888',
      )
      .attr('stroke-width', (d) => (d.type === 'collection' ? 0.5 : 1.5))
      .attr('stroke-opacity', (d) => (d.type === 'collection' ? 0.3 : 0.6))
      .attr('stroke-dasharray', (d) => (d.type === 'backlink' ? '4,4' : 'none'));

    // Nodes
    const nodeEls = svg
      .append('g')
      .selectAll('g')
      .data(graphNodes)
      .join('g')
      .attr('cursor', 'pointer');

    nodeEls
      .append('circle')
      .attr('r', (d) => (d.isCollection ? 18 : 10))
      .attr('fill', (d) => d.color)
      .attr('stroke', (d) => (selectedNode?.id === d.id ? '#fff' : 'transparent'))
      .attr('stroke-width', 2)
      .attr('opacity', (d) => (d.isCollection ? 0.8 : 0.9));

    nodeEls
      .append('text')
      .text((d) => (d.title.length > 20 ? d.title.substring(0, 18) + '...' : d.title))
      .attr('dx', (d) => (d.isCollection ? 22 : 14))
      .attr('dy', 4)
      .attr('fill', 'currentColor')
      .attr('font-size', (d) => (d.isCollection ? 11 : 9))
      .attr('font-weight', (d) => (d.isCollection ? '600' : '400'))
      .attr('opacity', 0.8)
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.5)');

    nodeEls
      .filter((d) => d.isCollection)
      .append('text')
      .text((d) => d.icon || '\uD83D\uDCC1')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', 12)
      .style('pointer-events', 'none');

    nodeEls
      .on('mouseenter', (_e, d) => setHoveredNode(d))
      .on('mouseleave', () => setHoveredNode(null))
      .on('click', (_e, d) => setSelectedNode(d))
      .on('dblclick', (_e, d) => {
        if (!d.isCollection) navigate(`/page/${d.id}`);
      });

    sim.on('tick', () => {
      linkEls
        .attr('x1', (d) => (d.source as unknown).x)
        .attr('y1', (d) => (d.source as unknown).y)
        .attr('x2', (d) => (d.target as unknown).x)
        .attr('y2', (d) => (d.target as unknown).y);
      nodeEls.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      void sim.stop();
    };
  }, [
    loading,
    graphNodes,
    graphLinks,
    showCollections,
    showParentChild,
    showBacklinks,
    selectedNode,
    navigate,
  ]);

  // ─── Zoom handlers ────────────────────────────────────────────────────

  const handleZoomIn = useCallback(() => {
    const g = svgRef.current?.parentElement?.querySelector('g');
    if (g) {
      const z = Math.min(zoom * 1.3, 4);
      g.setAttribute('transform', `scale(${z})`);
      setZoom(z);
    }
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    const g = svgRef.current?.parentElement?.querySelector('g');
    if (g) {
      const z = Math.max(zoom / 1.3, 0.2);
      g.setAttribute('transform', `scale(${z})`);
      setZoom(z);
    }
  }, [zoom]);

  const handleResetZoom = useCallback(() => {
    const g = svgRef.current?.parentElement?.querySelector('g');
    if (g) {
      g.setAttribute('transform', 'scale(1)');
      setZoom(1);
    }
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-sm text-muted-foreground">Loading graph data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-sm text-red-400 bg-red-500/10 px-4 py-2 rounded-md border border-red-500/30">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Share2 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Graph View</h1>
          <span className="text-xs text-muted-foreground">
            {graphNodes.length} nodes &middot; {graphLinks.length} links
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showCollections}
              onChange={(e) => setShowCollections(e.target.checked)}
              className="accent-primary"
            />
            C
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showParentChild}
              onChange={(e) => setShowParentChild(e.target.checked)}
              className="accent-primary"
            />
            P/C
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showBacklinks}
              onChange={(e) => setShowBacklinks(e.target.checked)}
              className="accent-primary"
            />
            BL
          </label>
          <span className="w-px h-4 bg-border mx-1" />
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Graph */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#0a0a0a]">
        <svg ref={svgRef} width="100%" height="100%" className="absolute inset-0" />

        {/* Info panel */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 max-w-xs p-3 rounded-lg border border-border bg-card/90 backdrop-blur-xs shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{selectedNode.icon}</span>
              <div>
                <div className="text-sm font-medium">{selectedNode.title}</div>
                <div className="text-[10px] text-muted-foreground">
                  {selectedNode.isCollection ? 'Collection' : 'Page'} &middot;{' '}
                  {selectedNode.collectionName}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {!selectedNode.isCollection && (
                <button
                  onClick={() => navigate(`/page/${selectedNode.id}`)}
                  className="h-6 px-2.5 rounded text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20"
                >
                  Open page
                </button>
              )}
              <button
                onClick={() => setSelectedNode(null)}
                className="h-6 px-2.5 rounded text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 p-3 rounded-lg border border-border bg-card/80 backdrop-blur-xs shadow-xl">
          <div className="text-[10px] font-medium text-muted-foreground mb-2">Legend</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-[#60a5fa]" />
              <span className="text-[10px] text-muted-foreground">Parent/Child</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-[#888] opacity-30" />
              <span className="text-[10px] text-muted-foreground">Collection</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3" style={{ borderTop: '1px dashed #f59e0b', height: 0 }} />
              <span className="text-[10px] text-muted-foreground">Backlink</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
