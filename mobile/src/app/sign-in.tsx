import { useAuth } from '../auth/AuthContext';
import { AuthScreen } from '../screens/AuthScreen';

export default function SignInRoute() {
  const { setUser } = useAuth();
  return <AuthScreen onAuthenticated={setUser} />;
}
