import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BottomNavigation, useBottomNavSpace } from '../components/BottomNavigation';
import { EditProfileModal } from '../components/EditProfileModal';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileShortcutGrid } from '../components/ProfileShortcutGrid';
import { ProfileStats } from '../components/ProfileStats';
import { RecentActivityCard } from '../components/RecentActivityCard';
import { YourRankCard } from '../components/YourRankCard';
import { getMyRank } from '../data/mockLeaderboard';
import { MOCK_ACTIVITY, MOCK_PROFILE, RECENT_ACTIVITY_COUNT } from '../data/mockProfile';
import { colors } from '../theme';

const OVERSCROLL = 1000;

export function ProfileScreen() {
  const navSpace = useBottomNavSpace();
  const [profile, setProfile] = useState(MOCK_PROFILE);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: navSpace + 16 }} showsVerticalScrollIndicator={false}>
        {/* Keeps the peach color above the gradient when iOS bounces past the top. */}
        <View style={styles.overscroll} />
        <LinearGradient
          colors={[colors.profileGradientTop, colors.profileGradientMid, colors.background]}
          locations={[0, 0.7, 1]}
          style={styles.upper}
        >
          <ProfileHeader
            profile={profile}
            onEdit={() => setEditOpen(true)}
            onOpenSettings={() => router.push('/settings')}
          />
          <View style={styles.upperContent}>
            <ProfileStats profile={profile} />
            <YourRankCard myRank={getMyRank()} onPress={() => router.navigate('/ranks')} />
          </View>
        </LinearGradient>

        <View style={styles.lower}>
          <ProfileShortcutGrid onOpen={(section) => router.push(`/profile-section/${section}`)} />
          <RecentActivityCard
            activity={MOCK_ACTIVITY.slice(0, RECENT_ACTIVITY_COUNT)}
            onViewAll={() => router.push('/activity')}
          />
        </View>
      </ScrollView>

      <BottomNavigation active="profile" />

      <EditProfileModal
        visible={editOpen}
        profile={profile}
        onSave={(edits) => {
          setProfile({ ...profile, ...edits });
          setEditOpen(false);
        }}
        onClose={() => setEditOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  overscroll: {
    position: 'absolute',
    top: -OVERSCROLL,
    left: 0,
    right: 0,
    height: OVERSCROLL,
    backgroundColor: colors.profileGradientTop,
  },
  upper: { paddingBottom: 26 },
  upperContent: { marginTop: 20, paddingHorizontal: 20, gap: 18 },
  lower: { paddingHorizontal: 20, paddingTop: 4, gap: 18 },
});
