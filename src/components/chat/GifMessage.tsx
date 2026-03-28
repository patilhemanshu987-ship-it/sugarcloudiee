import React from 'react';
import { Image, StyleSheet } from 'react-native';

type GifMessageProps = {
  url: string;
};

const GifMessage = ({ url }: GifMessageProps) => (
  <Image 
    source={{ uri: url }} 
    style={styles.gifImage}
    resizeMode="cover"
  />
);

const styles = StyleSheet.create({
  gifImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
  },
});

export default GifMessage;