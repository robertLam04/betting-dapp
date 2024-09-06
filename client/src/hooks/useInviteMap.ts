import { GameInvite } from '../components/DuoGame'; // Ensure GameInvite is correctly imported

type UseInviteMapReturn = {
  addInvite: (invite: GameInvite) => Promise<string>;
  deleteInvite: (invite: GameInvite) => Promise<string>;
  getInvites: (key: string) => Promise<GameInvite[] | undefined>;
  getNonce: () => Promise<number | undefined>;
};

const useInviteMap = (): UseInviteMapReturn => {
  const cloudFunctionUrl = import.meta.env.VITE_CLOUD_FUNCTION_URL;

  const addInvite = async (invite: GameInvite): Promise<string> => {
    try {
      const options: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          from: invite.fromAddress,
          to: invite.toAddress,
          wager: invite.wager,
          nonce: invite.nonce,
          signature: invite.signature
        }),
      };

      const response = await fetch(cloudFunctionUrl, options);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.text();
      return data;
    } catch (error) {
      console.error('Error adding invite:', error);
      throw error;
    }
  };

  const deleteInvite = async (invite: GameInvite): Promise<string> => {
    try {
      const options: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          from: invite.fromAddress,
          to: invite.toAddress,
          wager: invite.wager,
        }),
      };

      const response = await fetch(cloudFunctionUrl, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.text();
      return data;
    } catch (error) {
      console.error('Error deleting invite:', error);
      throw error;
    }
  };

  const getInvites = async (key: string): Promise<GameInvite[] | undefined> => {
    try {
      const url = new URL(cloudFunctionUrl);
      url.searchParams.append('action', 'getInvites');
      url.searchParams.append('to', key);

      const options: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const response = await fetch(url, options);

      //Fix no invites error
      const data: GameInvite[] = await response.json();
      console.log("Get Invites data:", data)
      return data;
    } catch (error) {
      console.error('Error fetching invites:', error);
      return undefined;
    }
  };

  const getNonce = async (): Promise<number | undefined> => {
    try {
      const url = new URL(cloudFunctionUrl);
      url.searchParams.append('action', 'getNonce');

      const options: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const nonce: number = data.nonce;
      console.log("Nonce:", nonce);
      return nonce;
    } catch (error) {
      console.error('Error fetching invites:', error);
      return undefined;
    }
  }

  return {
    addInvite,
    deleteInvite,
    getInvites,
    getNonce
  };

};

export default useInviteMap;