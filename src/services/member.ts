import { members } from '../mock/members';
import { paginate, sleep } from '../mock/util';
import type { Member, Paged } from '../types';

export interface MemberQuery {
  keyword?: string;
  level?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchMembers(query: MemberQuery = {}): Promise<Paged<Member>> {
  await sleep(300);
  const { keyword, level, page = 1, pageSize = 10 } = query;
  const kw = keyword?.trim();

  const filtered = members.filter((member) => {
    if (kw && !member.phone.includes(kw) && !member.memberNo.toLowerCase().includes(kw.toLowerCase())) {
      return false;
    }
    if (level && member.level !== level) return false;
    return true;
  });

  return paginate(filtered, page, pageSize);
}

export async function fetchMemberLevels(): Promise<string[]> {
  await sleep(80);
  return [...new Set(members.map((m) => m.level))];
}
