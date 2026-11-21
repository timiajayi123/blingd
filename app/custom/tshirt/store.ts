import { proxy } from 'valtio';

const state = proxy({
  intro: true,
  colors: ['#ccc', '#EFBD4E', '#80C670', '#726DE8', '#EF674E', '#353934'],
  selectedColor: '#EFBD4E',
  isLogoTexture: true,
  isFullTexture: false,
  logoDecal: '/placeholder.svg',
  fullDecal: '/placeholder.svg',
  
  // Text State
  text: 'Custom Text',
  textColor: '#ffffff',
  textFont: 'Inter',
  isText: false,
  textPosition: [0, 0.04, 0.15],
  textScale: 0.15,
  textDecal: null as string | null,

  // Shape State
  activeShape: null as string | null, // 'circle', 'square', 'triangle', 'star', 'heart'
  shapeColor: '#ffffff',
  isShape: false,
  shapePosition: [0, 0, 0.15],
  shapeScale: 0.15,
  shapeDecal: null as string | null,

  position: [0, 0.04, 0.15],
  scale: 0.15,
  rotation: 0,
  
  is3D: true,
});

export default state;
