import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActivityRow } from '../components/ActivityRow';
import type { TileRect } from '../components/ProfileShortcutCard';
import { RequestCardWindow } from '../components/RequestCardWindow';
import { SubScreen } from '../components/SubScreen';
import { useFindRequest, useMyActivity } from '../demo/selectors';
import { colors, radius } from '../theme';
import { EmptyNote } from '../components/ui';

export function ActivityScreen() {
  const activity = useMyActivity();
  const findRequest = useFindRequest();
  const [open, setOpen] = useState<{ requestId: string; origin: TileRect } | null>(null);

  return (
    <SubScreen title="Activity">
      <View style={styles.card}>
        {activity.length === 0 ? (
          <EmptyNote>No activity yet. Gifts you send will show up here.</EmptyNote>
        ) : (
          activity.map((item, i) => (
            <ActivityRow
              key={item.id}
              activity={item}
              divider={i > 0}
              onOpen={(requestId, origin) => setOpen({ requestId, origin })}
            />
          ))
        )}
      </View>
      <RequestCardWindow
        request={open ? (findRequest(open.requestId) ?? null) : null}
        origin={open?.origin ?? null}
        onClose={() => setOpen(null)}
      />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
