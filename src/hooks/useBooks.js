import { useState } from 'react';

export const useBooks = () => {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [volume, setVolume] = useState('');
  return { title, setTitle, price, setPrice, volume, setVolume };
};

