import { memberLevelConfigs, memberTagConfigs, members } from '../mock/members';
import { paginate, sleep } from '../mock/util';
import type { Member, MemberLevelConfig, MemberTagConfig, Paged, TagStatus } from '../types';

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

/** 会员信息页的等级筛选项。 */
export async function fetchMemberLevelNames(): Promise<string[]> {
  await sleep(80);
  return [...new Set(members.map((m) => m.level))];
}

export async function fetchLevelConfigs(): Promise<MemberLevelConfig[]> {
  await sleep(250);
  return [...memberLevelConfigs].sort((a, b) => a.order - b.order);
}

export async function saveLevelConfig(input: MemberLevelConfig): Promise<void> {
  await sleep(300);
  const index = memberLevelConfigs.findIndex((item) => item.id === input.id);
  if (index >= 0) memberLevelConfigs[index] = { ...input };
  else memberLevelConfigs.push({ ...input });
}

export interface TagQuery {
  keyword?: string;
  category?: string;
  type?: string;
  status?: TagStatus | 'all';
}

export async function fetchMemberTags(query: TagQuery = {}): Promise<MemberTagConfig[]> {
  await sleep(250);
  const { keyword, category, type, status = 'all' } = query;
  const kw = keyword?.trim();
  return memberTagConfigs.filter((tag) => {
    if (kw && !tag.name.includes(kw)) return false;
    if (category && tag.category !== category) return false;
    if (type && tag.type !== type) return false;
    if (status !== 'all' && tag.status !== status) return false;
    return true;
  });
}

export async function saveMemberTag(input: MemberTagConfig): Promise<void> {
  await sleep(300);
  const index = memberTagConfigs.findIndex((item) => item.id === input.id);
  if (index >= 0) memberTagConfigs[index] = { ...input };
  else memberTagConfigs.unshift({ ...input });
}

export async function updateMemberTagStatus(id: string, status: TagStatus): Promise<void> {
  await sleep(150);
  const target = memberTagConfigs.find((item) => item.id === id);
  if (target) target.status = status;
}

export async function removeMemberTag(id: string): Promise<void> {
  await sleep(200);
  const index = memberTagConfigs.findIndex((item) => item.id === id);
  if (index >= 0) memberTagConfigs.splice(index, 1);
}
