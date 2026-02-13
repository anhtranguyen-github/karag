'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { API_BASE_URL } from '@/lib/api-config';
import { Loader2, Info } from 'lucide-react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphNode {
    id: string;
    name: string;
    type: 'document' | 'workspace' | 'vector';
    val?: number;
    x?: number;
    y?: number;
}

interface GraphLink {
    source: string;
    target: string;
    value?: number;
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

export function DocumentGraph({ workspaceId }: { workspaceId: string }) {
    const [data, setData] = useState<GraphData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    useEffect(() => {
        const fetchGraph = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/graph`);
                if (res.ok) {
                    const result = await res.json();
                    if (result.success && result.data) {
                        const graphData = result.data;
                        // Map "edges" to "links" for the library
                        setData({
                            nodes: graphData.nodes || [],
                            links: graphData.edges || []
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to fetch graph data', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGraph();
    }, [workspaceId]);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [containerRef]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 text-caption">Mapping semantic landscape...</p>
                </div>
            </div>
        );
    }

    if (!data || data.nodes.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 min-h-[400px] border border-dashed border-white/10 rounded-xl bg-white/5">
                <Info className="w-12 h-12 mb-4 text-gray-700" />
                <p className="font-medium text-white">Not enough semantic data</p>
                <p className="text-caption max-w-xs text-center mt-2">
                    We need at least two indexed documents to visualize relationships.
                    Ensure your documents are fully indexed.
                </p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex-1 h-full bg-[#0a0a0b] rounded-xl overflow-hidden border border-white/5 relative min-h-[600px]">
            <ForceGraph2D
                graphData={data || { nodes: [], links: [] }}
                width={dimensions.width}
                height={dimensions.height}
                backgroundColor="#0a0a0b"
                nodeLabel="name"
                linkColor={() => '#ffffff10'}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={1.5}
                linkDirectionalParticleSpeed={d => ((d as unknown) as GraphLink).value ? ((d as unknown) as GraphLink).value! * 0.005 : 0.001}
                nodeCanvasObject={(n, ctx, globalScale) => {
                    const node = n as GraphNode;
                    const label = node.name;
                    const fontSize = 12 / globalScale;
                    ctx.font = `${fontSize}px var(--font-outfit), sans-serif`;

                    // Draw node circle
                    const r = 5;
                    ctx.beginPath();
                    ctx.arc(node.x || 0, node.y || 0, r, 0, 2 * Math.PI, false);
                    ctx.fillStyle = '#3b82f6';
                    ctx.fill();

                    // Add glow effect
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = '#3b82f6aa';
                    ctx.stroke();
                    ctx.shadowBlur = 0;

                    // Draw text
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#a1a1aa';

                    // Truncate long names
                    const truncatedLabel = label.length > 20 ? label.substring(0, 17) + '...' : label;
                    ctx.fillText(truncatedLabel, node.x || 0, (node.y || 0) + r + fontSize + 2);
                }}
            />

            {/* Legend/HUD */}
            <div className="absolute top-6 left-6 p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 text-tiny text-gray-400 pointer-events-none select-none shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                    <h4 className="font-bold text-white uppercase tracking-[0.2em]">Semantic Topology</h4>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-8">
                        <span className="text-gray-500">Node</span>
                        <span className="text-white">Document</span>
                    </div>
                    <div className="flex items-center justify-between gap-8">
                        <span className="text-gray-500">Edge</span>
                        <span className="text-white">Semantic Similarity {'>'} 0.75</span>
                    </div>
                    <div className="flex items-center justify-between gap-8">
                        <span className="text-gray-500">Particles</span>
                        <span className="text-white">Relationship Strength</span>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-tiny leading-relaxed opacity-60">
                        Proximity indicates conceptual alignment based on vector embeddings.
                    </p>
                </div>
            </div>

            {/* Controls hint */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 text-tiny text-gray-500 flex gap-4 pointer-events-none uppercase tracking-tighter">
                <span>Left Click: Pan</span>
                <span className="w-px h-3 bg-white/10" />
                <span>Scroll: Zoom</span>
                <span className="w-px h-3 bg-white/10" />
                <span>Drag: Reposition</span>
            </div>
        </div>
    );
}
