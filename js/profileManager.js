/**
 * profileManager.js - 小朋友多档案、自适应难度与错题本持久化存储系统 (完全对标 shuxue)
 */
import { AVATAR_LIST } from './config.js';

const STORAGE_KEY = 'pvz_math_user_profiles_v2';

const DEFAULT_PROFILES = {
    activeUserId: 'child_lele',
    users: [
        {
            id: 'child_lele',
            name: '乐乐',
            avatar: '🐰',
            difficulty: {
                mode: 'custom',
                presetGrade: 'grade1_2',
                operations: ['add', 'sub'],
                range: 20,
                maxMultiplier: 5,
                allowCarryBorrow: true,
                allowFillBlank: true
            },
            history: [],
            mistakes: []
        },
        {
            id: 'child_chuan',
            name: '川川',
            avatar: '🐸',
            difficulty: {
                mode: 'custom',
                presetGrade: 'grade1_2',
                operations: ['add', 'sub'],
                range: 50,
                maxMultiplier: 5,
                allowCarryBorrow: true,
                allowFillBlank: true
            },
            history: [],
            mistakes: []
        }
    ]
};

export class UserProfileManager {
    constructor() {
        this.data = this.loadData();
        this.ensureValid();
    }

    loadData() {
        try {
            if (typeof localStorage !== 'undefined') {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
                        return parsed;
                    }
                }
            }
        } catch (e) {
            console.warn('[UserProfileManager] 读取本地档案失败:', e);
        }
        return JSON.parse(JSON.stringify(DEFAULT_PROFILES));
    }

    save() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
            }
        } catch (e) {
            console.warn('[UserProfileManager] 保存本地档案失败:', e);
        }
    }

    ensureValid() {
        if (!this.data.users || this.data.users.length === 0) {
            this.data = JSON.parse(JSON.stringify(DEFAULT_PROFILES));
        }
        if (!this.data.users.some(u => u.id === this.data.activeUserId)) {
            this.data.activeUserId = this.data.users[0].id;
        }
        this.save();
    }

    getUsers() {
        return this.data.users || [];
    }

    getUser(id) {
        return this.data.users.find(u => u.id === id) || null;
    }

    getActiveUser() {
        return this.getUser(this.data.activeUserId) || this.data.users[0];
    }

    setActiveUser(id) {
        if (this.data.users.some(u => u.id === id)) {
            this.data.activeUserId = id;
            this.save();
            return this.getActiveUser();
        }
        return null;
    }

    addUser({ name, avatar, difficulty }) {
        const id = 'child_' + Date.now();
        const newUser = {
            id,
            name: (name || '宝贝').trim(),
            avatar: avatar || AVATAR_LIST[Math.floor(Math.random() * AVATAR_LIST.length)],
            difficulty: difficulty || {
                mode: 'custom',
                presetGrade: 'grade1_2',
                operations: ['add', 'sub'],
                range: 20,
                maxMultiplier: 5,
                allowCarryBorrow: true,
                allowFillBlank: true
            },
            history: [],
            mistakes: []
        };
        this.data.users.push(newUser);
        this.data.activeUserId = id;
        this.save();
        return newUser;
    }

    updateUser(id, { name, avatar, difficulty }) {
        const user = this.getUser(id);
        if (!user) return null;
        if (name !== undefined) user.name = (name || user.name).trim();
        if (avatar !== undefined) user.avatar = avatar;
        if (difficulty !== undefined) user.difficulty = difficulty;
        this.save();
        return user;
    }

    deleteUser(id) {
        if (this.data.users.length <= 1) {
            return false; // 至少保留一个小朋友
        }
        this.data.users = this.data.users.filter(u => u.id !== id);
        if (this.data.activeUserId === id) {
            this.data.activeUserId = this.data.users[0].id;
        }
        this.save();
        return true;
    }

    recordGameRound(record) {
        const user = this.getActiveUser();
        if (!user) return;
        if (!Array.isArray(user.history)) user.history = [];
        if (!Array.isArray(user.mistakes)) user.mistakes = [];

        user.history.unshift({
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString().slice(0, 5),
            levelId: record.levelId || '1-1',
            total: record.total || 0,
            correct: record.correct || 0,
            accuracy: record.accuracy || 100,
            maxCombo: record.maxCombo || 0
        });

        if (user.history.length > 30) {
            user.history = user.history.slice(0, 30);
        }

        // 收集错题
        if (record.mistakes && record.mistakes.length > 0) {
            record.mistakes.forEach(m => {
                const exists = user.mistakes.find(old => old.formula === m.formula);
                if (!exists) {
                    user.mistakes.unshift({
                        formula: m.formula,
                        expected: m.expected,
                        userAns: m.userAns,
                        date: new Date().toLocaleDateString()
                    });
                }
            });
            if (user.mistakes.length > 50) {
                user.mistakes = user.mistakes.slice(0, 50);
            }
        }

        this.save();
    }

    clearUserHistory(userId) {
        const user = this.getUser(userId);
        if (user) {
            user.history = [];
            user.mistakes = [];
            this.save();
        }
    }
}

export const profileManager = new UserProfileManager();
