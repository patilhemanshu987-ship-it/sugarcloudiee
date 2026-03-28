import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useTheme } from '../context';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { typography } from '../utils/typography';

type HomeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Home'>;
};

type Friend = {
  id: string;
  username: string;
  avatarUrl?: string | null;
  status?: 'online' | 'offline';
};

type FriendRequest = {
  id: number;
  fromUserId: string;
  username: string;
  avatarUrl?: string | null;
};

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const { theme, toggleTheme, colors } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequestIds, setOutgoingRequestIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user's friends on mount
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    await Promise.all([loadFriends(), loadIncomingRequests(), loadOutgoingRequests()]);
  };

  const loadFriends = async () => {
    try {
      const { data: sentFriends, error: sentError } = await supabase
        .from('friends')
        .select(`
          friend:profiles!friends_friend_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq('user_id', user?.id)
        .eq('status', 'accepted');

      if (sentError) throw sentError;

      const { data: receivedFriends, error: receivedError } = await supabase
        .from('friends')
        .select(`
          requester:profiles!friends_user_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq('friend_id', user?.id)
        .eq('status', 'accepted');

      if (receivedError) throw receivedError;

      const sentList = sentFriends?.map((item: any) => ({
        id: item.friend.id,
        username: item.friend.username,
        avatarUrl: item.friend.avatar_url,
      })) || [];

      const receivedList = receivedFriends?.map((item: any) => ({
        id: item.requester.id,
        username: item.requester.username,
        avatarUrl: item.requester.avatar_url,
      })) || [];

      const merged = [...sentList, ...receivedList];
      const uniqueFriends = merged.filter(
        (item, index, arr) => arr.findIndex((f) => f.id === item.id) === index
      );
      
      setFriends(uniqueFriends);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadIncomingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          requester:profiles!friends_user_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq('friend_id', user?.id)
        .eq('status', 'pending');

      if (error) throw error;

      const requests = data?.map((item: any) => ({
        id: item.id,
        fromUserId: item.requester.id,
        username: item.requester.username,
        avatarUrl: item.requester.avatar_url,
      })) || [];

      setIncomingRequests(requests);
    } catch (error) {
      console.error('Error loading incoming requests:', error);
    }
  };

  const loadOutgoingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user?.id)
        .eq('status', 'pending');

      if (error) throw error;

      setOutgoingRequestIds(data?.map((row: any) => row.friend_id) || []);
    } catch (error) {
      console.error('Error loading outgoing requests:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', user?.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (friendId: string, friendUsername: string) => {
    if (!user?.id) return;

    try {
      // If the other user already sent you a request, auto-accept it.
      const { data: reversePending, error: reverseError } = await supabase
        .from('friends')
        .select('id, status')
        .eq('user_id', friendId)
        .eq('friend_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (reverseError) throw reverseError;

      if (reversePending?.id) {
        const { error: acceptError } = await supabase
          .from('friends')
          .update({ status: 'accepted' })
          .eq('id', reversePending.id);

        if (acceptError) throw acceptError;

        Alert.alert('Success', `You are now friends with @${friendUsername}`);
        setSearchQuery('');
        setSearchResults([]);
        await loadAllData();
        return;
      }

      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: user?.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (error) throw error;
      
      Alert.alert('Success', `Friend request sent to @${friendUsername}`);
      setSearchQuery('');
      setSearchResults([]);
      await loadAllData();
    } catch (error) {
      console.error('Request error:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const acceptFriendRequest = async (requestId: number, username: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      Alert.alert('Success', `You are now friends with @${username}`);
      await loadAllData();
    } catch (error) {
      console.error('Accept request error:', error);
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const rejectFriendRequest = async (requestId: number) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      await loadAllData();
    } catch (error) {
      console.error('Reject request error:', error);
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  const startChat = (friend: Friend) => {
    // Generate a consistent connection ID based on both user IDs
    const connectionId = [user?.id, friend.id].sort().join('-');
    navigation.navigate('Chat', { 
      connectionId, 
      isInitiator: true,
      friendId: friend.id,
      friendUsername: friend.username,
      friendAvatarUrl: friend.avatarUrl ?? undefined,
    });
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={[styles.friendItem, { backgroundColor: colors.card }]}
      onPress={() => startChat(item)}
    >
      <View style={styles.friendMainInfo}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.friendAvatar} />
        ) : (
          <View style={[styles.friendAvatarFallback, { backgroundColor: colors.inputBorder }]}>
            <Text style={[styles.friendAvatarText, { color: colors.headerText }]}> 
              {(item.username?.[0] || '?').toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.friendUsername, { color: colors.headerText }]}>@{item.username}</Text>
      </View>
      <Text style={[styles.chatIndicator, { color: colors.myBubble }]}>
        Tap to chat →
      </Text>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: any }) => {
    const isFriend = friends.some((friend) => friend.id === item.id);
    const hasOutgoingRequest = outgoingRequestIds.includes(item.id);
    const incomingRequest = incomingRequests.find((request) => request.fromUserId === item.id);

    const buttonLabel = isFriend
      ? 'Friends'
      : hasOutgoingRequest
        ? 'Requested'
        : incomingRequest
          ? 'Accept Request'
          : 'Send Request';

    const buttonDisabled = isFriend || hasOutgoingRequest;

    const handlePress = () => {
      if (buttonDisabled) return;
      if (incomingRequest) {
        acceptFriendRequest(incomingRequest.id, item.username);
      } else {
        sendFriendRequest(item.id, item.username);
      }
    };

    return (
      <View style={[styles.searchResult, { backgroundColor: colors.card }]}> 
      <View style={styles.friendMainInfo}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.friendAvatar} />
        ) : (
          <View style={[styles.friendAvatarFallback, { backgroundColor: colors.inputBorder }]}>
            <Text style={[styles.friendAvatarText, { color: colors.headerText }]}> 
              {(item.username?.[0] || '?').toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.searchUsername, { color: colors.headerText }]}>@{item.username}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.requestActionButton,
          {
            backgroundColor: buttonDisabled ? colors.inputBorder : colors.myBubble,
          },
        ]}
        onPress={handlePress}
        disabled={buttonDisabled}
      >
        <Text
          style={[
            styles.requestActionText,
            { color: buttonDisabled ? colors.otherTimestamp : colors.myText },
          ]}
        >
          {buttonLabel}
        </Text>
      </TouchableOpacity>
    </View>
    );
  };

  const renderIncomingRequest = ({ item }: { item: FriendRequest }) => (
    <View style={[styles.requestItem, { backgroundColor: colors.card }]}> 
      <View style={styles.friendMainInfo}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.friendAvatar} />
        ) : (
          <View style={[styles.friendAvatarFallback, { backgroundColor: colors.inputBorder }]}>
            <Text style={[styles.friendAvatarText, { color: colors.headerText }]}> 
              {(item.username?.[0] || '?').toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.searchUsername, { color: colors.headerText }]}>@{item.username}</Text>
      </View>
      <View style={styles.requestActionsRow}>
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: colors.statusOnline }]}
          onPress={() => acceptFriendRequest(item.id, item.username)}
        >
          <Text style={[styles.requestActionText, { color: '#FFFFFF' }]}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rejectButton, { borderColor: colors.inputBorder }]}
          onPress={() => rejectFriendRequest(item.id)}
        >
          <Text style={[styles.requestActionText, { color: colors.headerText }]}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
          <Text style={styles.themeIcon}>{theme === 'light' ? '🌙' : '☀️'}</Text>
        </TouchableOpacity>
        <Text style={[styles.username, { color: colors.headerText }]}>
          @{user?.username}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Search Section */}
        <View style={styles.searchSection}>
          <TextInput
            style={[styles.searchInput, { 
              backgroundColor: colors.inputBg,
              borderColor: colors.inputBorder,
              color: colors.headerText,
            }]}
            placeholder="Search by @username..."
            placeholderTextColor={colors.otherTimestamp}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            onSubmitEditing={searchUsers}
          />
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.myBubble }]}
            onPress={searchUsers}
            disabled={loading}
          >
            <Text style={[styles.searchButtonText, { color: colors.myText }]}>
              {loading ? '...' : 'Search'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.headerText }]}>
              Search Results
            </Text>
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={item => item.id}
              style={styles.resultsList}
            />
          </View>
        )}

        {/* Incoming Requests */}
        <View style={styles.requestsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.headerText }]}>Incoming Requests</Text>
          {incomingRequests.length > 0 ? (
            <FlatList
              data={incomingRequests}
              renderItem={renderIncomingRequest}
              keyExtractor={(item) => String(item.id)}
              style={styles.resultsList}
            />
          ) : (
            <Text style={[styles.emptySmallText, { color: colors.otherTimestamp }]}>No pending requests</Text>
          )}
        </View>

        {/* Friends List */}
        <View style={styles.friendsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.headerText }]}>
            Your Friends
          </Text>
          {friends.length > 0 ? (
            <FlatList
              data={friends}
              renderItem={renderFriend}
              keyExtractor={item => item.id}
              style={styles.friendsList}
            />
          ) : (
            <Text style={[styles.emptyText, { color: colors.otherTimestamp }]}>
              No friends yet. Search for someone to connect!
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  themeButton: {
    padding: 10,
  },
  themeIcon: {
    fontSize: 24,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 22,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  searchSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    marginBottom: 20,
  },
  requestsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  resultsList: {
    maxHeight: 200,
  },
  searchResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
  },
  searchUsername: {
    fontSize: 16,
  },
  addIndicator: {
    fontSize: 14,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
  },
  requestActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  rejectButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  requestActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  friendMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
  },
  friendAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  friendsContainer: {
    flex: 1,
  },
  friendsList: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
  },
  friendUsername: {
    fontSize: 16,
    fontWeight: '500',
  },
  chatIndicator: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 14,
  },
  emptySmallText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default HomeScreen;