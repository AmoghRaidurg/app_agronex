export function getProductImage(name: string) {
  const key = name?.toLowerCase() || '';
  if (key.includes('maize')) return 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=500';
  if (key.includes('wheat')) return 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500';
  if (key.includes('rice')) return 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?w=500';
  if (key.includes('potato')) return 'https://images.unsplash.com/photo-1518977673343-a4e0f49d846b?w=500';
  if (key.includes('tomato')) return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500';
  if (key.includes('onion')) return 'https://images.unsplash.com/photo-1620574387735-3624d75b2dbc?w=500';
  return 'https://images.unsplash.com/photo-1595856454584-53fb16278ea4?w=500';
}
