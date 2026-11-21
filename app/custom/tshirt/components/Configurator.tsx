"use client";

import React, { useState, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import state from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Type, Palette, Shapes, Download, Box, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { generateTextTexture, generateShapeTexture } from './utils';

const Configurator = () => {
  const snap = useSnapshot(state);
  const [activeTab, setActiveTab] = useState<'color' | 'file' | 'shape' | 'text'>('color');
  const [isExpanded, setIsExpanded] = useState(true);

  // Initialize Text and Shape textures on mount
  useEffect(() => {
    if (snap.text && !snap.textDecal) {
      state.textDecal = generateTextTexture(snap.text, snap.textFont, snap.textColor);
    }
    if (snap.activeShape && !snap.shapeDecal) {
      state.shapeDecal = generateShapeTexture(snap.activeShape, snap.shapeColor);
    }
  }, []);

  const handleDecalUpload = (type: 'logo' | 'full', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        if (type === 'logo') {
          state.logoDecal = e.target.result as string;
          state.isLogoTexture = true;
          state.isText = false;
          state.isShape = false;
        } else {
          state.fullDecal = e.target.result as string;
          state.isFullTexture = true;
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTextChange = (key: 'text' | 'font' | 'color', value: string) => {
    if (key === 'text') state.text = value;
    if (key === 'font') state.textFont = value;
    if (key === 'color') state.textColor = value;

    state.textDecal = generateTextTexture(state.text, state.textFont, state.textColor);
    state.isText = true;
    state.isLogoTexture = false;
    state.isShape = false;
  };

  const handleShapeChange = (shape: string) => {
    state.activeShape = shape;
    state.shapeDecal = generateShapeTexture(shape, state.shapeColor);
    state.isShape = true;
    state.isLogoTexture = false;
    state.isText = false;
  };

  const handleShapeColorChange = (color: string) => {
    state.shapeColor = color;
    if (state.activeShape) {
      state.shapeDecal = generateShapeTexture(state.activeShape, color);
    }
  };

  const fonts = ['Inter', 'Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana', 'Impact', 'Comic Sans MS'];
  const shapes = ['circle', 'square', 'triangle', 'star', 'heart'];

  return (
    <div className="absolute top-0 left-0 z-10 w-full h-full pointer-events-none flex flex-col justify-between">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center p-4 pointer-events-auto"
      >
        <div className="bg-white/80 backdrop-blur-md p-2 px-4 rounded-full shadow-lg border border-white/50 flex items-center gap-4">
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
            3D Studio
          </h1>
          
          <div className="h-6 w-px bg-gray-300 hidden sm:block" />
          
          <button 
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => state.is3D = !state.is3D}
          >
            {snap.is3D ? <Box size={18} className="text-blue-600" /> : <Square size={18} className="text-purple-600" />}
            <span className="text-sm font-medium text-gray-700">{snap.is3D ? '3D View' : '2D View'}</span>
          </button>
        </div>
      </motion.header>

      {/* Bottom Controls Panel */}
      <motion.div 
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto w-full bg-white/90 backdrop-blur-xl border-t border-white/50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-3xl overflow-hidden flex flex-col max-h-[60vh]"
      >
        {/* Tab Navigation */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('color')}
            className={`flex-1 min-w-[80px] py-4 flex flex-col items-center gap-1 transition-colors ${activeTab === 'color' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Palette size={20} />
            <span className="text-xs font-medium">Color</span>
          </button>
          <button 
            onClick={() => setActiveTab('file')}
            className={`flex-1 min-w-[80px] py-4 flex flex-col items-center gap-1 transition-colors ${activeTab === 'file' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Upload size={20} />
            <span className="text-xs font-medium">Upload</span>
          </button>
          <button 
            onClick={() => setActiveTab('shape')}
            className={`flex-1 min-w-[80px] py-4 flex flex-col items-center gap-1 transition-colors ${activeTab === 'shape' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Shapes size={20} />
            <span className="text-xs font-medium">Shapes</span>
          </button>
          <button 
            onClick={() => setActiveTab('text')}
            className={`flex-1 min-w-[80px] py-4 flex flex-col items-center gap-1 transition-colors ${activeTab === 'text' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Type size={20} />
            <span className="text-xs font-medium">Text</span>
          </button>
          
          <button 
             onClick={() => setIsExpanded(!isExpanded)}
             className="px-4 text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-6 overflow-y-auto"
            >
              {activeTab === 'color' && (
                <div className="flex flex-wrap justify-center gap-4">
                  {snap.colors.map((color) => (
                    <button
                      key={color}
                      className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${snap.selectedColor === color ? 'border-blue-500 shadow-lg scale-110' : 'border-gray-200'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => state.selectedColor = color}
                    />
                  ))}
                </div>
              )}

              {activeTab === 'file' && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center gap-2 transition-colors">
                      <Upload size={24} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">Upload Logo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => e.target.files?.[0] && handleDecalUpload('logo', e.target.files[0])}
                      />
                    </label>
                    <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center gap-2 transition-colors">
                      <Shapes size={24} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">Full Texture</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => e.target.files?.[0] && handleDecalUpload('full', e.target.files[0])}
                      />
                    </label>
                  </div>
                  
                  {snap.isLogoTexture && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Adjust Logo</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-12">Scale</span>
                          <input 
                            type="range" min="0.05" max="0.5" step="0.01"
                            value={snap.scale}
                            onChange={(e) => state.scale = parseFloat(e.target.value)}
                            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-12">Y-Pos</span>
                          <input 
                            type="range" min="-0.3" max="0.3" step="0.01"
                            value={snap.position[1]}
                            onChange={(e) => state.position[1] = parseFloat(e.target.value)}
                            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 w-12">Rotate</span>
                            <input 
                              type="range" min="0" max={Math.PI * 2} step="0.1"
                              value={snap.rotation}
                              onChange={(e) => state.rotation = parseFloat(e.target.value)}
                              className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'shape' && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Choose Shape</h3>
                    <div className="flex flex-wrap gap-4">
                      {shapes.map(shape => (
                        <button
                          key={shape}
                          onClick={() => handleShapeChange(shape)}
                          className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${snap.activeShape === shape && snap.isShape ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                        >
                          {shape === 'circle' && <div className="w-6 h-6 rounded-full bg-current" />}
                          {shape === 'square' && <div className="w-6 h-6 bg-current" />}
                          {shape === 'triangle' && <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[20px] border-b-current" />}
                          {shape === 'star' && <Shapes size={20} />}
                          {shape === 'heart' && <div className="text-xl">♥</div>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Shape Color</h3>
                    <div className="flex flex-wrap gap-3">
                      {snap.colors.map((color) => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-full border-2 transition-transform ${snap.shapeColor === color ? 'border-blue-500 scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => handleShapeColorChange(color)}
                        />
                      ))}
                    </div>
                  </div>

                  {snap.isShape && (
                     <div className="p-4 bg-gray-50 rounded-xl">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Adjust Shape</h3>
                       <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-12">Scale</span>
                          <input 
                            type="range" min="0.05" max="0.5" step="0.01"
                            value={snap.shapeScale}
                            onChange={(e) => state.shapeScale = parseFloat(e.target.value)}
                            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-12">Y-Pos</span>
                          <input 
                            type="range" min="-0.3" max="0.3" step="0.01"
                            value={snap.shapePosition[1]}
                            onChange={(e) => state.shapePosition[1] = parseFloat(e.target.value)}
                            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'text' && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Enter Text</h3>
                    <input 
                      type="text"
                      value={snap.text}
                      onChange={(e) => handleTextChange('text', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your text here..."
                    />
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Font Style</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {fonts.map(font => (
                        <button
                          key={font}
                          onClick={() => handleTextChange('font', font)}
                          style={{ fontFamily: font }}
                          className={`p-2 rounded-lg border text-sm transition-colors ${snap.textFont === font ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {font}
                        </button>
                      ))}
                    </div>
                  </div>

                   <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Text Color</h3>
                    <div className="flex flex-wrap gap-3">
                      {['#ffffff', '#000000', ...snap.colors].map((color) => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-full border-2 transition-transform ${snap.textColor === color ? 'border-blue-500 scale-110' : 'border-gray-200'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => handleTextChange('color', color)}
                        />
                      ))}
                    </div>
                  </div>
                  
                   {snap.isText && (
                     <div className="p-4 bg-gray-50 rounded-xl">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Adjust Text</h3>
                       <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-12">Scale</span>
                          <input 
                            type="range" min="0.05" max="0.5" step="0.01"
                            value={snap.textScale}
                            onChange={(e) => state.textScale = parseFloat(e.target.value)}
                            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-12">Y-Pos</span>
                          <input 
                            type="range" min="-0.3" max="0.3" step="0.01"
                            value={snap.textPosition[1]}
                            onChange={(e) => state.textPosition[1] = parseFloat(e.target.value)}
                            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Bar */}
        <div className="p-4 border-t border-gray-100 flex gap-4 justify-center bg-gray-50/50">
           <button 
            className="bg-black text-white px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm"
            onClick={() => alert("Design saved! (This would download the GLB or PNG)")}
          >
            <Download size={18} />
            Save Design
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Configurator;
