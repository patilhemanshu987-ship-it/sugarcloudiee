import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

type LoadingIndicatorProps = {
  message?: string;
};

const LoadingIndicator = ({ message = 'Loading...' }: LoadingIndicatorProps) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="#4CAF50" />
    <Text style={styles.text}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default LoadingIndicator;