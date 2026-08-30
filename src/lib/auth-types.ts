export type SessionClaims = {
  userId: string;
  churchId: string | null;
};

export type AuthContext = {
  userId: string;
  churchId: string | null;
  permissions: string[];
};

export type PublicUser = {
  id: string;
  name: string;
  churchId: string | null;
  churchName: string | null;
  roleLabel: string;
  permissions: string[];
  isPlatformAdmin: boolean;
};
