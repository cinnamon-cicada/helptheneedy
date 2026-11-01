import { PlaceholderCard, SubScreen } from './SubScreen';

export function SettingsPlaceholder() {
  return (
    <SubScreen title="Settings">
      <PlaceholderCard
        title="Not available yet"
        body="Account and privacy settings will live here. This is a prototype, so nothing can be changed yet."
      />
    </SubScreen>
  );
}
