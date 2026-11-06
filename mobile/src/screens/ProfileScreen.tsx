import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BottomNavigation, useBottomNavSpace } from '../components/BottomNavigation';
import { EditProfileModal } from '../components/EditProfileModal';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileListWindow } from '../components/ProfileListWindow';
import type { TileRect } from '../components/ProfileShortcutCard';
import { ProfileShortcutGrid, type ProfileSection } from '../components/ProfileShortcutGrid';
import { ProfileStats } from '../components/ProfileStats';
import { RecentActivityCard } from '../components/RecentActivityCard';
import { RequestCardWindow } from '../components/RequestCardWindow';
import { YourRankCard } from '../components/YourRankCard';
import { getMyRank } from '../data/mockLeaderboard';
import { RECENT_ACTIVITY_COUNT } from '../data/mockProfile';
import { useDemo } from '../demo/DemoProvider';
import { useFindRequest, useMyActivity, useMyProfile, useProfileLists } from '../demo/selectors';
import { colors } from '../theme';

export function ProfileScreen() {
  const navSpace = useBottomNavSpace();
  const profile = useMyProfile();
  const activity = useMyActivity();
  const findRequest = useFindRequest();
  const lists = useProfileLists();
  const { updateProfile } = useDemo();
  const [editOpen, setEditOpen] = useState(false);
  const [openList, setOpenList] = useState<{ section: ProfileSection; origin: TileRect } | null>(null);
  const [openCard, setOpenCard] = useState<{ requestId: string; origin: TileRect } | null>(null);
  const openRequest = (requestId: string, origin: TileRect) => setOpenCard({ requestId, origin });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: navSpace + 16 }} showsVerticalScrollIndicator={false}>
        <ProfileHeader
          profile={profile}
          onEdit={() => setEditOpen(true)}
          onOpenSettings={() => router.push('/settings')}
        />
        <View style={styles.upper}>
          <ProfileStats profile={profile} />
          <YourRankCard myRank={getMyRank()} onPress={() => router.navigate('/ranks')} />
        </View>

        <View style={styles.lower}>
          <ProfileShortcutGrid onOpen={(section, origin) => setOpenList({ section, origin })} />
          <RecentActivityCard
            activity={activity.slice(0, RECENT_ACTIVITY_COUNT)}
            onViewAll={() => router.push('/activity')}
            onOpen={openRequest}
          />
        </View>
      </ScrollView>

      <BottomNavigation active="profile" />

      <ProfileListWindow
        lists={lists}
        section={openList?.section ?? null}
        origin={openList?.origin ?? null}
        onClose={() => setOpenList(null)}
        onOpenItem={openRequest}
      />

      <RequestCardWindow
        request={openCard ? (findRequest(openCard.requestId) ?? null) : null}
        origin={openCard?.origin ?? null}
        onClose={() => setOpenCard(null)}
      />

      <EditProfileModal
        visible={editOpen}
        profile={profile}
        onSave={(edits) => {
          updateProfile(edits);
          setEditOpen(false);
        }}
        onClose={() => setEditOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  upper: { marginTop: 20, marginBottom: 22, paddingHorizontal: 20, gap: 18 },
  lower: { paddingHorizontal: 20, gap: 18 },
});
