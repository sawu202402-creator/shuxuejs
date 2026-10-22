/**
 * config.js - 原版 1:1 植物大战僵尸数值体系与关卡推进树
 */

export const GAME_CONFIG = {
    // 经典 900x600 无畸变原版画幅与草坪网格系统
    canvas: {
        width: 900,
        height: 600,
        rows: 5,
        cols: 9,
        // 原版草坪瓦片精准测绘像素
        gridStartX: 40,
        gridStartY: 80,
        cellWidth: 82,
        cellHeight: 98
    },

    // 经典生命与资源
    initialSun: 150,     // 初始赠送阳光
    sunValueNatural: 25, // 自然阳光与向日葵产出阳光
    sunValueMath: 50,    // 答对数学题掉落的超级阳光
    sunValueMathCombo: 75, // 连击3题以上单题阳光
    sunValueMathSuper: 100,// 连击5题以上单题阳光
    maxLives: 5,         // 爱心生命（僵尸突破底线消耗）
    
    // 连击与超载
    comboThresholdCharge: 3,  // 3连击触发攻速狂暴 (+35%)
    comboThresholdUlt: 5,     // 5连击触发全屏觉醒大招
    chargeDuration: 6.0,      // 狂暴持续时间（秒）

    // 原版植物参数 (HP, 阳光, 冷却CD, 伤害, 攻频)
    plants: {
        peashooter: {
            id: 'peashooter',
            name: '豌豆射手',
            cost: 100,
            cooldown: 7.5,
            hp: 300,
            damage: 20,
            attackInterval: 1.425,
            isDiurnal: true,
            desc: '直线单发绿豌豆，基础火力防线',
            icon: 'assets/cards/card_peashooter.png',
            anim: 'assets/plants/peashooter.gif',
            bulletAnim: 'assets/projectiles/pea.gif',
            splatAnim: 'assets/projectiles/pea_splat.gif',
            unlockLevel: '1-1'
        },
        sunflower: {
            id: 'sunflower',
            name: '向日葵',
            cost: 50,
            cooldown: 7.5,
            hp: 300,
            firstSunTime: 7.0,
            sunInterval: 24.0,
            isDiurnal: true,
            desc: '每隔24秒生产一颗25点阳光',
            icon: 'assets/cards/card_sunflower.png',
            anim: 'assets/plants/sunflower.gif',
            unlockLevel: '1-2'
        },
        cherrybomb: {
            id: 'cherrybomb',
            name: '樱桃炸弹',
            cost: 150,
            cooldown: 50.0,
            hp: 300,
            damage: 1800,
            radius: 1.5,
            fuseTime: 1.2,
            desc: '3x3格瞬时毁灭性灰烬爆炸 (1800伤害)',
            icon: 'assets/cards/card_cherrybomb.png',
            anim: 'assets/plants/cherrybomb.gif',
            boomAnim: 'assets/projectiles/cherry_boom.gif',
            unlockLevel: '1-3'
        },
        wallnut: {
            id: 'wallnut',
            name: '坚果墙',
            cost: 50,
            cooldown: 30.0,
            hp: 4000,
            desc: '超高耐久护盾，可抗住僵尸40秒啃咬',
            icon: 'assets/cards/card_wallnut.png',
            anim: 'assets/plants/wallnut.gif',
            crack1Anim: 'assets/plants/wallnut_cracked1.gif',
            crack2Anim: 'assets/plants/wallnut_cracked2.gif',
            crackThreshold1: 2666,
            crackThreshold2: 1333,
            unlockLevel: '1-4'
        },
        bowling_nut: {
            id: 'bowling_nut',
            name: '保龄坚果',
            cost: 0,
            cooldown: 0,
            hp: 9999,
            damage: 400,
            desc: '在红线左侧发射！沿直线高速滚出，撞击僵尸折射弹跳 (400伤害)',
            icon: 'assets/cards/card_bowling_nut.png',
            anim: 'assets/plants/wallnut.gif'
        },
        bowling_rednut: {
            id: 'bowling_rednut',
            name: '赤红爆炸坚果',
            cost: 0,
            cooldown: 0,
            hp: 9999,
            damage: 1800,
            desc: '在红线左侧发射！撞击首个目标触发 3x3 剧烈烈火爆破 (1800伤害)',
            icon: 'assets/cards/card_rednut.png',
            anim: 'assets/plants/wallnut_red.png'
        },
        potatomine: {
            id: 'potatomine',
            name: '土豆地雷',
            cost: 25,
            cooldown: 30.0,
            hp: 300,
            armTime: 15.0,
            damage: 1800,
            desc: '需15秒武装，僵尸踩中瞬间引爆 (1800伤害)',
            icon: 'assets/cards/card_potatomine.png',
            unarmedAnim: 'assets/plants/potatomine_unarmed.gif',
            armedAnim: 'assets/plants/potatomine_armed.gif',
            boomAnim: 'assets/projectiles/spudow.gif',
            unlockLevel: '1-6'
        },
        snowpea: {
            id: 'snowpea',
            name: '雪花豌豆',
            cost: 175,
            cooldown: 7.5,
            hp: 300,
            damage: 20,
            attackInterval: 1.425,
            slowRate: 0.5,
            slowDuration: 10.0,
            isDiurnal: true,
            desc: '发射寒冰豌豆，伤害20并使僵尸减速50%',
            icon: 'assets/cards/card_snowpea.png',
            anim: 'assets/plants/snowpea.gif',
            bulletAnim: 'assets/projectiles/snow_pea.gif',
            unlockLevel: '1-7'
        },
        chomper: {
            id: 'chomper',
            name: '大嘴花',
            cost: 150,
            cooldown: 7.5,
            hp: 300,
            swallowRange: 1.2,
            chewTime: 42.0,
            isDiurnal: true,
            desc: '一口吞掉前方一整只僵尸，需咀嚼42秒',
            icon: 'assets/cards/card_chomper.png',
            anim: 'assets/plants/chomper.gif',
            attackAnim: 'assets/plants/chomper_attack.gif',
            digestAnim: 'assets/plants/chomper_digest.gif',
            unlockLevel: '1-8'
        },
        repeater: {
            id: 'repeater',
            name: '双发射手',
            cost: 200,
            cooldown: 7.5,
            hp: 300,
            damage: 20,
            bulletCount: 2,
            bulletDelay: 0.2,
            attackInterval: 1.425,
            isDiurnal: true,
            desc: '一次连续射出两颗豌豆，双倍火力输出',
            icon: 'assets/cards/card_repeater.png',
            anim: 'assets/plants/repeater.gif',
            bulletAnim: 'assets/projectiles/pea.gif',
            unlockLevel: '1-9'
        },
        puffshroom: {
            id: 'puffshroom',
            name: '小喷菇',
            cost: 0,
            cooldown: 7.5,
            hp: 300,
            damage: 20,
            attackInterval: 1.425,
            range: 300,
            isNocturnal: true,
            desc: '免费向前方近距离喷射孢子，黑夜主力防御植物',
            icon: 'assets/cards/card_puffshroom.png',
            anim: 'assets/plants/puffshroom.gif',
            sleepAnim: 'assets/plants/puffshroom_sleep.gif',
            bulletAnim: 'assets/projectiles/shroom_bullet.gif',
            splatAnim: 'assets/projectiles/shroom_splat.gif',
            unlockLevel: '2-1'
        },
        sunshroom: {
            id: 'sunshroom',
            name: '阳光菇',
            cost: 25,
            cooldown: 7.5,
            hp: 300,
            growTime: 90.0,
            smallSunVal: 15,
            bigSunVal: 25,
            isNocturnal: true,
            desc: '初生产出小阳光(15)，长大后产出正常阳光(25)',
            icon: 'assets/cards/card_sunshroom.png',
            anim: 'assets/plants/sunshroom.gif',
            sleepAnim: 'assets/plants/sunshroom_sleep.gif',
            bigAnim: 'assets/plants/sunshroom_big.gif',
            unlockLevel: '2-2'
        },
        fumeshroom: {
            id: 'fumeshroom',
            name: '大喷菇',
            cost: 75,
            cooldown: 7.5,
            hp: 300,
            damage: 20,
            attackInterval: 1.425,
            range: 340,
            isNocturnal: true,
            desc: '喷射穿透性孢子云雾，同时攻击直线4格内所有僵尸(包括铁栅门)',
            icon: 'assets/cards/card_fumeshroom.png',
            anim: 'assets/plants/fumeshroom.gif',
            sleepAnim: 'assets/plants/fumeshroom_sleep.gif',
            cloudAnim: 'assets/projectiles/fume_cloud.gif',
            unlockLevel: '2-3'
        },
        gravebuster: {
            id: 'gravebuster',
            name: '墓碑吞噬者',
            cost: 75,
            cooldown: 7.5,
            hp: 300,
            chewTime: 4.5,
            isTombOnly: true,
            isNocturnal: true,
            desc: '种在墓碑上吞噬墓碑，清除后掉落阳光',
            icon: 'assets/cards/card_gravebuster.png',
            anim: 'assets/plants/gravebuster.gif',
            unlockLevel: '2-4'
        },
        hypnoshroom: {
            id: 'hypnoshroom',
            name: '魅惑菇',
            cost: 75,
            cooldown: 30.0,
            hp: 300,
            isNocturnal: true,
            desc: '被僵尸啃食后，使该僵尸倒戈反向攻击其他僵尸',
            icon: 'assets/cards/card_hypnoshroom.png',
            anim: 'assets/plants/hypnoshroom.gif',
            unlockLevel: '2-5'
        },
        scaredyshroom: {
            id: 'scaredyshroom',
            name: '胆小菇',
            cost: 25,
            cooldown: 7.5,
            hp: 300,
            damage: 20,
            attackInterval: 1.425,
            scaredDistance: 130,
            isNocturnal: true,
            desc: '远程发射孢子，但僵尸接近时会吓得缩入地下无法攻击',
            icon: 'assets/cards/card_scaredyshroom.png',
            anim: 'assets/plants/scaredyshroom.gif',
            sleepAnim: 'assets/plants/scaredyshroom_sleep.gif',
            hideAnim: 'assets/plants/scaredyshroom_hide.gif',
            bulletAnim: 'assets/projectiles/shroom_bullet.gif',
            splatAnim: 'assets/projectiles/shroom_splat.gif',
            unlockLevel: '2-6'
        },
        iceshroom: {
            id: 'iceshroom',
            name: '寒冰菇',
            cost: 75,
            cooldown: 50.0,
            hp: 300,
            damage: 20,
            freezeDuration: 4.0,
            slowDuration: 10.0,
            isNocturnal: true,
            desc: '瞬间冻结全场所有僵尸4秒并造成减速',
            icon: 'assets/cards/card_iceshroom.png',
            anim: 'assets/plants/iceshroom.gif',
            unlockLevel: '2-7'
        },
        doomshroom: {
            id: 'doomshroom',
            name: '毁灭菇',
            cost: 125,
            cooldown: 50.0,
            hp: 300,
            damage: 1800,
            isNocturnal: true,
            desc: '引发毁灭性核爆(1800伤害)，消灭巨幅范围内全部僵尸',
            icon: 'assets/cards/card_doomshroom.png',
            anim: 'assets/plants/doomshroom.gif',
            boomAnim: 'assets/projectiles/cherry_boom.gif',
            unlockLevel: '2-8'
        },
        coffeebean: {
            id: 'coffeebean',
            name: '咖啡豆',
            cost: 75,
            cooldown: 7.5,
            hp: 300,
            desc: '种在睡觉的植物上，唤醒它们使其正常工作',
            icon: 'assets/cards/card_coffeebean.png',
            anim: 'assets/plants/coffeebean.gif',
            eatAnim: 'assets/plants/coffeebean_eat.gif',
            isWakeOnly: true,
            unlockLevel: '2-1'
        },
        lilypad: {
            id: 'lilypad',
            name: '睡莲',
            cost: 25,
            cooldown: 7.5,
            hp: 300,
            isAquatic: true,
            desc: '种植在水面上，可承载一株非水生陆地植物',
            icon: 'assets/cards/card_lilypad.png',
            anim: 'assets/plants/lilypad.gif',
            unlockLevel: '3-1'
        },
        squash: {
            id: 'squash',
            name: '窝瓜',
            cost: 50,
            cooldown: 30.0,
            hp: 300,
            damage: 1800,
            desc: '发现前方或后方僵尸时跃起压扁 (1800伤害)',
            icon: 'assets/cards/card_squash.png',
            anim: 'assets/plants/squash.gif',
            attackAnim: 'assets/plants/squash_attack.gif',
            unlockLevel: '3-2'
        },
        threepeater: {
            id: 'threepeater',
            name: '三线射手',
            cost: 325,
            cooldown: 7.5,
            hp: 300,
            damage: 20,
            attackInterval: 1.425,
            isDiurnal: true,
            desc: '一次射出三颗豌豆，覆盖自身及相邻两条航道',
            icon: 'assets/cards/card_threepeater.png',
            anim: 'assets/plants/threepeater.gif',
            bulletAnim: 'assets/projectiles/pea.gif',
            unlockLevel: '3-3'
        },
        jalapeno: {
            id: 'jalapeno',
            name: '火爆辣椒',
            cost: 125,
            cooldown: 50.0,
            hp: 300,
            damage: 1800,
            fuseTime: 0.9,
            desc: '引爆后焚烧整整一整行所有僵尸 (1800伤害)',
            icon: 'assets/cards/card_jalapeno.png',
            anim: 'assets/plants/jalapeno.gif',
            unlockLevel: '3-4'
        },
        torchwood: {
            id: 'torchwood',
            name: '火炬树桩',
            cost: 175,
            cooldown: 7.5,
            hp: 300,
            desc: '穿过的普通豌豆将化为烈焰火球，攻击力翻倍！',
            icon: 'assets/cards/card_torchwood.png',
            anim: 'assets/plants/torchwood.gif',
            unlockLevel: '3-5'
        },
        tallnut: {
            id: 'tallnut',
            name: '高坚果',
            cost: 125,
            cooldown: 30.0,
            hp: 8000,
            isTall: true,
            desc: '身形高大、具有极高耐久 (8000 HP)，并能彻底拦截撑杆跳僵尸！',
            icon: 'assets/cards/card_tallnut.png',
            anim: 'assets/plants/tallnut.gif',
            crack1Anim: 'assets/plants/wallnut_cracked1.gif',
            crack2Anim: 'assets/plants/wallnut_cracked2.gif',
            crackThreshold1: 5333,
            crackThreshold2: 2666,
            unlockLevel: '3-6'
        },
        seashroom: {
            id: 'seashroom',
            name: '海蘑菇',
            cost: 0,
            cooldown: 30.0,
            hp: 300,
            damage: 20,
            attackInterval: 1.425,
            range: 300,
            isAquatic: true,
            isNocturnal: true,
            desc: '免费的水生喷射蘑菇，仅能在水中种植',
            icon: 'assets/cards/card_seashroom.png',
            anim: 'assets/plants/seashroom.gif',
            sleepAnim: 'assets/plants/seashroom_sleep.gif',
            unlockLevel: '4-1'
        },
        starfruit: {
            id: 'starfruit',
            name: '星星果/杨桃',
            cost: 125,
            cooldown: 7.5,
            hp: 300,
            damage: 20,
            attackInterval: 1.425,
            desc: '向 5 个方向同时发射锋利飞星，全方位打击',
            icon: 'assets/cards/card_starfruit.png',
            anim: 'assets/plants/starfruit.gif',
            unlockLevel: '4-2'
        },
        pumpkin: {
            id: 'pumpkin',
            name: '南瓜头',
            cost: 125,
            cooldown: 30.0,
            hp: 4000,
            desc: '套在任何植物外层提供4000点坚固护甲防护',
            icon: 'assets/cards/card_pumpkin.png',
            anim: 'assets/plants/pumpkin.gif',
            crack1Anim: 'assets/plants/pumpkin_cracked1.gif',
            crack2Anim: 'assets/plants/pumpkin_cracked2.gif',
            crackThreshold1: 2666,
            crackThreshold2: 1333,
            unlockLevel: '4-3'
        },
        magnetshroom: {
            id: 'magnetshroom',
            name: '磁力菇',
            cost: 100,
            cooldown: 15.0,
            hp: 300,
            isNocturnal: true,
            desc: '吸走僵尸身上的铁桶、铁栅门和头盔防具',
            icon: 'assets/cards/card_magnetshroom.png',
            anim: 'assets/plants/magnetshroom.gif',
            unlockLevel: '4-4'
        },
        blover: {
            id: 'blover',
            name: '三叶草',
            cost: 100,
            cooldown: 7.5,
            hp: 300,
            desc: '瞬间刮起狂风吹散全场浓雾15秒',
            icon: 'assets/cards/card_blover.png',
            anim: 'assets/plants/blover.gif',
            unlockLevel: '4-5'
        },
        cabbagepult: {
            id: 'cabbagepult',
            name: '卷心菜投手',
            cost: 100,
            cooldown: 7.5,
            hp: 300,
            damage: 40,
            attackInterval: 2.85,
            desc: '高抛投掷卷心菜，不受屋顶斜坡阻挡(40伤害)',
            icon: 'assets/cards/card_cabbagepult.png',
            anim: 'assets/plants/cabbagepult.gif',
            attackAnim: 'assets/plants/cabbagepult_attack.gif',
            unlockLevel: '5-1'
        },
        flowerpot: {
            id: 'flowerpot',
            name: '花盆',
            cost: 25,
            cooldown: 7.5,
            hp: 300,
            isPot: true,
            desc: '种植在屋顶瓦片上，承载各种陆地植物',
            icon: 'assets/cards/card_flowerpot.png',
            anim: 'assets/plants/flowerpot.gif',
            unlockLevel: '5-1'
        },
        kernelpult: {
            id: 'kernelpult',
            name: '玉米投手',
            cost: 100,
            cooldown: 7.5,
            hp: 300,
            damage: 20,
            attackInterval: 2.85,
            desc: '投掷玉米粒，并有几率投掷黄油定身僵尸4秒！',
            icon: 'assets/cards/card_kernelpult.png',
            anim: 'assets/plants/kernelpult.gif',
            attackAnim: 'assets/plants/kernelpult_attack.gif',
            unlockLevel: '5-2'
        },
        garlic: {
            id: 'garlic',
            name: '大蒜',
            cost: 50,
            cooldown: 7.5,
            hp: 400,
            desc: '僵尸咬上一口会被辛辣呛到，立即转向相邻航道',
            icon: 'assets/cards/card_garlic.png',
            anim: 'assets/plants/garlic.gif',
            unlockLevel: '5-3'
        },
        melonpult: {
            id: 'melonpult',
            name: '西瓜投手',
            cost: 300,
            cooldown: 7.5,
            hp: 300,
            damage: 80,
            splashDamage: 26,
            attackInterval: 2.85,
            desc: '投掷沉重西瓜造成80点重击，并附带3x3群伤溅射！',
            icon: 'assets/cards/card_melonpult.png',
            anim: 'assets/plants/melonpult.gif',
            attackAnim: 'assets/plants/melonpult_attack.gif',
            unlockLevel: '5-4'
        }
    },

    // 原版僵尸参数 (HP, 护甲, 速度, 攻击力)
    // 官方原版标准：
    // - 普通僵尸/旗帜僵尸：本体 270 HP，受到 200 伤害（正好10颗豌豆）后掉头进入濒死状态（剩余 70 HP），流血或被击中死亡
    // - 路障僵尸：路障护甲 370 HP（承受约19颗豌豆破盾），本体 270 HP，总计 640 HP
    // - 铁桶僵尸：铁桶护甲 1100 HP（承受55颗豌豆破盾），本体 270 HP，总计 1370 HP
    zombies: {
        normal: {
            id: 'normal',
            name: '普通僵尸',
            hp: 270,
            armorHp: 0,
            headLossThreshold: 70,
            speed: 18,
            dps: 100,
            biteInterval: 0.25,
            biteDamage: 25,
            score: 100,
            walkAnims: [
                'assets/zombies/zombie_walk.gif',
                'assets/zombies/zombie_walk2.gif',
                'assets/zombies/zombie_walk3.gif'
            ],
            attackAnim: 'assets/zombies/zombie_attack.gif',
            headAnim: 'assets/zombies/zombie_head.gif',
            dieAnim: 'assets/zombies/zombie_die.gif',
            lostHeadWalkAnim: 'assets/zombies/zombie_losthead_walk.gif',
            lostHeadAttackAnim: 'assets/zombies/zombie_losthead_attack.gif'
        },
        flag: {
            id: 'flag',
            name: '旗帜僵尸',
            hp: 270,
            armorHp: 0,
            headLossThreshold: 70,
            speed: 24,
            dps: 100,
            biteInterval: 0.25,
            biteDamage: 25,
            score: 150,
            walkAnims: ['assets/zombies/zombie_walk.gif'],
            attackAnim: 'assets/zombies/zombie_attack.gif',
            headAnim: 'assets/zombies/zombie_head.gif',
            dieAnim: 'assets/zombies/zombie_die.gif'
        },
        conehead: {
            id: 'conehead',
            name: '路障僵尸',
            hp: 270,
            armorHp: 370,
            headLossThreshold: 70,
            speed: 18,
            dps: 100,
            biteInterval: 0.25,
            biteDamage: 25,
            score: 250,
            hasShield: true,
            shieldType: 'cone',
            walkAnims: ['assets/zombies/conehead_walk.gif'],
            attackAnim: 'assets/zombies/conehead_attack.gif',
            headAnim: 'assets/zombies/zombie_head.gif',
            dieAnim: 'assets/zombies/zombie_die.gif'
        },
        buckethead: {
            id: 'buckethead',
            name: '铁桶僵尸',
            hp: 270,
            armorHp: 1100,
            headLossThreshold: 70,
            speed: 18,
            dps: 100,
            biteInterval: 0.25,
            biteDamage: 25,
            score: 500,
            hasShield: true,
            shieldType: 'bucket',
            walkAnims: ['assets/zombies/buckethead_walk.gif'],
            attackAnim: 'assets/zombies/buckethead_attack.gif',
            headAnim: 'assets/zombies/zombie_head.gif',
            dieAnim: 'assets/zombies/zombie_die.gif'
        },
        newspaper: {
            id: 'newspaper',
            name: '读报僵尸',
            hp: 200,
            armorHp: 150,
            headLossThreshold: 70,
            speed: 18,
            rageSpeed: 48,
            dps: 100,
            rageDps: 150,
            biteInterval: 0.25,
            biteDamage: 25,
            score: 300,
            hasShield: true,
            shieldType: 'newspaper',
            walkAnims: ['assets/zombies/zombie_walk.gif'],
            rageAnim: 'assets/zombies/newspaper_lost.gif',
            attackAnim: 'assets/zombies/zombie_attack.gif',
            headAnim: 'assets/zombies/zombie_head.gif',
            dieAnim: 'assets/zombies/zombie_die.gif'
        },
        screendoor: {
            id: 'screendoor',
            name: '铁栅门僵尸',
            hp: 270,
            armorHp: 1100,
            headLossThreshold: 70,
            speed: 18,
            dps: 100,
            biteInterval: 0.25,
            biteDamage: 25,
            score: 450,
            hasShield: true,
            shieldType: 'screendoor',
            walkAnims: ['assets/zombies/buckethead_walk.gif'],
            attackAnim: 'assets/zombies/buckethead_attack.gif',
            headAnim: 'assets/zombies/zombie_head.gif',
            dieAnim: 'assets/zombies/zombie_die.gif'
        },
        football: {
            id: 'football',
            name: '橄榄球僵尸',
            hp: 270,
            armorHp: 1400,
            headLossThreshold: 70,
            speed: 40,
            dps: 100,
            biteInterval: 0.25,
            biteDamage: 25,
            score: 600,
            hasShield: true,
            shieldType: 'football',
            walkAnims: ['assets/zombies/conehead_walk.gif'],
            attackAnim: 'assets/zombies/conehead_attack.gif',
            headAnim: 'assets/zombies/zombie_head.gif',
            dieAnim: 'assets/zombies/zombie_die.gif'
        },
        polevault: {
            id: 'polevault',
            name: '撑杆跳僵尸',
            hp: 500,
            headLossThreshold: 70,
            speed: 42,
            walkSpeed: 18,
            dps: 100,
            biteInterval: 0.25,
            biteDamage: 25,
            score: 350,
            hasPole: true,
            runAnim: 'assets/zombies/polevault_run.gif',
            jumpAnim: 'assets/zombies/polevault_jump.gif',
            walkAnim: 'assets/zombies/polevault_walk.gif',
            attackAnim: 'assets/zombies/polevault_attack.gif',
            dieAnim: 'assets/zombies/polevault_die.gif',
            walkAnims: ['assets/zombies/polevault_run.gif']
        }
    },

    // 原版 1-1 至 1-10 关卡规格推进树 (使用 900x600 无拉伸视窗)
    // 官方节奏：第一波僵尸有充裕的备战期（20~25s），后续波次在僵尸击溃后经 5 秒休整或最大延时触发
    levels: {
        '1-1': {
            id: '1-1',
            world: 1,
            title: '第 1-1 关：单轨初探',
            bg: 'assets/backgrounds/day_1row_viewport.jpg',
            activeRows: [2], // 仅开放中间第3行 (row 2)
            allowedPlants: ['peashooter'],
            rewardPlant: 'sunflower',
            rewardText: '恭喜解锁：向日葵！每隔24秒生产阳光！',
            waves: [
                { delay: 25, zombies: [{ type: 'normal', row: 2 }] },
                { delay: 25, zombies: [{ type: 'normal', row: 2 }] },
                { delay: 25, zombies: [{ type: 'normal', row: 2 }] },
                { delay: 28, isFlag: true, zombies: [{ type: 'normal', row: 2 }, { type: 'normal', row: 2 }] }
            ]
        },
        '1-2': {
            id: '1-2',
            world: 1,
            title: '第 1-2 关：三路开花',
            bg: 'assets/backgrounds/day_3row_viewport.jpg',
            activeRows: [1, 2, 3], // 开放中间三行 (第2、3、4行)
            allowedPlants: ['peashooter', 'sunflower'],
            rewardPlant: 'cherrybomb',
            rewardText: '恭喜解锁：樱桃炸弹！瞬间引爆3x3九宫格！',
            waves: [
                { delay: 22, zombies: [{ type: 'normal', row: 2 }] },
                { delay: 25, zombies: [{ type: 'normal', row: 1 }] },
                { delay: 25, zombies: [{ type: 'normal', row: 3 }] },
                { delay: 24, zombies: [{ type: 'normal', row: 2 }] },
                { delay: 24, zombies: [{ type: 'normal', row: 1 }] },
                { delay: 26, isFlag: true, zombies: [{ type: 'flag', row: 2 }, { type: 'normal', row: 1 }, { type: 'normal', row: 3 }] }
            ]
        },
        '1-3': {
            id: '1-3',
            world: 1,
            title: '第 1-3 关：五路全开·路障初现',
            bg: 'assets/backgrounds/day_5row_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            allowedPlants: ['peashooter', 'sunflower', 'cherrybomb'],
            rewardPlant: 'wallnut',
            rewardText: '恭喜解锁：坚果墙！超高生命值为你抵挡千军万马！',
            waves: [
                { delay: 20, zombies: [{ type: 'normal', row: 2 }] },
                { delay: 24, zombies: [{ type: 'normal', row: 0 }] },
                { delay: 25, zombies: [{ type: 'conehead', row: 3 }] },
                { delay: 24, zombies: [{ type: 'normal', row: 4 }] },
                { delay: 25, zombies: [{ type: 'conehead', row: 1 }] },
                { delay: 24, zombies: [{ type: 'normal', row: 2 }, { type: 'normal', row: 0 }] },
                { delay: 28, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'conehead', row: 1 },
                    { type: 'conehead', row: 3 },
                    { type: 'normal', row: 0 },
                    { type: 'normal', row: 4 }
                ]}
            ]
        },
        '1-4': {
            id: '1-4',
            world: 1,
            title: '第 1-4 关：铜墙铁壁',
            bg: 'assets/backgrounds/day_5row_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            allowedPlants: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut'],
            rewardPlant: 'shovel',
            rewardText: '恭喜解锁：园艺铲子！可以自由挖除不需要的植物！',
            waves: [
                { delay: 20, zombies: [{ type: 'normal', row: 1 }] },
                { delay: 24, zombies: [{ type: 'conehead', row: 2 }] },
                { delay: 24, zombies: [{ type: 'normal', row: 4 }, { type: 'normal', row: 0 }] },
                { delay: 24, zombies: [{ type: 'conehead', row: 3 }] },
                { delay: 24, zombies: [{ type: 'normal', row: 2 }, { type: 'conehead', row: 1 }] },
                { delay: 28, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'conehead', row: 0 },
                    { type: 'conehead', row: 4 },
                    { type: 'normal', row: 1 },
                    { type: 'normal', row: 3 }
                ]}
            ]
        },
        '1-5': {
            id: '1-5',
            world: 1,
            title: '第 1-5 关：坚果保龄球特别试炼',
            bg: 'assets/backgrounds/day_5row_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            isConveyorBelt: true,
            isBowling: true,
            bowlingBoundaryCol: 2,
            conveyorCards: ['bowling_nut', 'bowling_rednut'],
            allowedPlants: ['bowling_nut', 'bowling_rednut'],
            rewardPlant: 'potatomine',
            rewardText: '恭喜通关坚果保龄球！获得全新防守神器：土豆地雷！',
            waves: [
                { delay: 10, zombies: [{ type: 'normal', row: 2 }] },
                { delay: 12, zombies: [{ type: 'conehead', row: 1 }] },
                { delay: 14, zombies: [{ type: 'normal', row: 3 }, { type: 'normal', row: 4 }] },
                { delay: 15, zombies: [{ type: 'conehead', row: 0 }, { type: 'buckethead', row: 2 }] },
                { delay: 16, zombies: [{ type: 'buckethead', row: 1 }, { type: 'conehead', row: 4 }] },
                { delay: 20, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 0 },
                    { type: 'conehead', row: 1 },
                    { type: 'conehead', row: 3 },
                    { type: 'buckethead', row: 4 },
                    { type: 'normal', row: 2 }
                ]},
                { delay: 22, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 0 },
                    { type: 'buckethead', row: 1 },
                    { type: 'conehead', row: 2 },
                    { type: 'buckethead', row: 3 },
                    { type: 'conehead', row: 4 },
                    { type: 'normal', row: 0 },
                    { type: 'normal', row: 2 },
                    { type: 'normal', row: 4 }
                ]}
            ]
        },
        '1-6': {
            id: '1-6',
            world: 1,
            title: '第 1-6 关：埋伏奇袭',
            bg: 'assets/backgrounds/day_5row_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            allowedPlants: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine'],
            rewardPlant: 'snowpea',
            rewardText: '恭喜解锁：雪花豌豆！发射寒冰豌豆造成50%移速减速！',
            waves: [
                { delay: 20, zombies: [{ type: 'normal', row: 3 }] },
                { delay: 24, zombies: [{ type: 'normal', row: 0 }] },
                { delay: 25, zombies: [{ type: 'conehead', row: 2 }] },
                { delay: 24, zombies: [{ type: 'normal', row: 4 }, { type: 'conehead', row: 1 }] },
                { delay: 25, zombies: [{ type: 'conehead', row: 3 }] },
                { delay: 28, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'conehead', row: 0 },
                    { type: 'conehead', row: 2 },
                    { type: 'conehead', row: 4 },
                    { type: 'normal', row: 1 },
                    { type: 'normal', row: 3 }
                ]}
            ]
        },
        '1-7': {
            id: '1-7',
            world: 1,
            title: '第 1-7 关：重装铁桶的震慑',
            bg: 'assets/backgrounds/day_5row_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            allowedPlants: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea'],
            rewardPlant: 'chomper',
            rewardText: '恭喜解锁：大嘴花！大口吞掉整只僵尸！',
            waves: [
                { delay: 20, zombies: [{ type: 'normal', row: 2 }] },
                { delay: 24, zombies: [{ type: 'conehead', row: 1 }] },
                { delay: 25, zombies: [{ type: 'buckethead', row: 3 }] },
                { delay: 24, zombies: [{ type: 'normal', row: 0 }, { type: 'conehead', row: 4 }] },
                { delay: 26, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 1 },
                    { type: 'conehead', row: 3 },
                    { type: 'normal', row: 0 }
                ]},
                { delay: 28, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 2 },
                    { type: 'buckethead', row: 4 },
                    { type: 'conehead', row: 0 },
                    { type: 'normal', row: 1 },
                    { type: 'normal', row: 3 }
                ]}
            ]
        },
        '1-8': {
            id: '1-8',
            world: 1,
            title: '第 1-8 关：巨兽巨口',
            bg: 'assets/backgrounds/day_5row_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            allowedPlants: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea', 'chomper'],
            rewardPlant: 'repeater',
            rewardText: '恭喜解锁：双发射手！每次射出两颗豌豆，双倍爆发火力！',
            waves: [
                { delay: 20, zombies: [{ type: 'normal', row: 4 }] },
                { delay: 24, zombies: [{ type: 'conehead', row: 2 }] },
                { delay: 25, zombies: [{ type: 'buckethead', row: 0 }] },
                { delay: 24, zombies: [{ type: 'conehead', row: 3 }, { type: 'normal', row: 1 }] },
                { delay: 26, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 3 },
                    { type: 'conehead', row: 1 },
                    { type: 'normal', row: 4 }
                ]},
                { delay: 28, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 0 },
                    { type: 'buckethead', row: 4 },
                    { type: 'conehead', row: 2 },
                    { type: 'normal', row: 1 },
                    { type: 'normal', row: 3 }
                ]}
            ]
        },
        '1-9': {
            id: '1-9',
            world: 1,
            title: '第 1-9 关：决战前夕·军团压境',
            bg: 'assets/backgrounds/day_5row_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            allowedPlants: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea', 'chomper', 'repeater'],
            rewardPlant: 'note',
            rewardText: '发现了戴夫留下的信件：“僵尸大军即将发起最终总攻，守住后院！”',
            waves: [
                { delay: 18, zombies: [{ type: 'normal', row: 1 }] },
                { delay: 22, zombies: [{ type: 'conehead', row: 3 }] },
                { delay: 24, zombies: [{ type: 'buckethead', row: 2 }] },
                { delay: 24, zombies: [{ type: 'conehead', row: 0 }, { type: 'conehead', row: 4 }] },
                { delay: 26, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 1 },
                    { type: 'buckethead', row: 3 },
                    { type: 'conehead', row: 0 },
                    { type: 'normal', row: 4 }
                ]},
                { delay: 28, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 0 },
                    { type: 'buckethead', row: 2 },
                    { type: 'buckethead', row: 4 },
                    { type: 'conehead', row: 1 },
                    { type: 'conehead', row: 3 }
                ]}
            ]
        },
        '1-10': {
            id: '1-10',
            world: 1,
            title: '第 1-10 关：后院大决战 (传送带终极试炼)',
            bg: 'assets/backgrounds/day_5row_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            isConveyorBelt: true,
            conveyorCards: ['peashooter', 'repeater', 'snowpea', 'wallnut', 'potatomine', 'cherrybomb', 'chomper'],
            allowedPlants: ['peashooter', 'repeater', 'snowpea', 'wallnut', 'potatomine', 'cherrybomb', 'chomper'],
            rewardPlant: 'puffshroom',
            rewardText: '🎉 击退白天僵尸总攻！获得夜行植物：小喷菇（0阳光免费）！黑夜即将降临！',
            waves: [
                { delay: 15, zombies: [{ type: 'normal', row: 2 }] },
                { delay: 18, zombies: [{ type: 'conehead', row: 1 }] },
                { delay: 20, zombies: [{ type: 'normal', row: 3 }, { type: 'conehead', row: 4 }] },
                { delay: 22, zombies: [{ type: 'buckethead', row: 0 }] },
                { delay: 24, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 1 },
                    { type: 'conehead', row: 3 },
                    { type: 'conehead', row: 0 },
                    { type: 'normal', row: 4 }
                ]},
                { delay: 26, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 2 },
                    { type: 'buckethead', row: 4 },
                    { type: 'conehead', row: 1 },
                    { type: 'conehead', row: 3 },
                    { type: 'normal', row: 0 }
                ]},
                { delay: 28, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 0 },
                    { type: 'buckethead', row: 1 },
                    { type: 'buckethead', row: 2 },
                    { type: 'buckethead', row: 3 },
                    { type: 'buckethead', row: 4 }
                ]}
            ]
        },
        '2-1': {
            id: '2-1',
            world: 2,
            title: '第 2-1 关：黑夜初临 (小喷菇与阳光菇)',
            bg: 'assets/backgrounds/night_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            tombstones: [{ row: 1, col: 7 }, { row: 3, col: 6 }],
            allowedPlants: ['puffshroom', 'sunshroom', 'wallnut', 'potatomine', 'cherrybomb', 'coffeebean', 'peashooter', 'sunflower'],
            rewardPlant: 'fumeshroom',
            rewardText: '恭喜解锁：大喷菇！喷射穿透性孢子云雾，同时攻击直线4格内所有僵尸！',
            waves: [
                { delay: 20, zombies: [{ type: 'normal', row: 2 }] },
                { delay: 22, zombies: [{ type: 'newspaper', row: 3 }] },
                { delay: 22, zombies: [{ type: 'normal', row: 1 }, { type: 'conehead', row: 4 }] },
                { delay: 24, zombies: [{ type: 'newspaper', row: 0 }, { type: 'normal', row: 2 }] },
                { delay: 26, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'newspaper', row: 1 },
                    { type: 'conehead', row: 3 },
                    { type: 'normal', row: 0 },
                    { type: 'normal', row: 4 }
                ]}
            ]
        },
        '2-2': {
            id: '2-2',
            world: 2,
            title: '第 2-2 关：穿透云雾 (大喷菇登场)',
            bg: 'assets/backgrounds/night_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            tombstones: [{ row: 0, col: 6 }, { row: 2, col: 7 }, { row: 4, col: 6 }],
            allowedPlants: ['puffshroom', 'sunshroom', 'fumeshroom', 'wallnut', 'potatomine', 'cherrybomb', 'coffeebean', 'peashooter', 'sunflower'],
            rewardPlant: 'gravebuster',
            rewardText: '恭喜解锁：墓碑吞噬者！种在墓碑上吞噬墓碑，清除后掉落阳光！',
            waves: [
                { delay: 20, zombies: [{ type: 'normal', row: 1 }] },
                { delay: 22, zombies: [{ type: 'conehead', row: 3 }] },
                { delay: 22, zombies: [{ type: 'newspaper', row: 2 }, { type: 'normal', row: 0 }] },
                { delay: 24, zombies: [{ type: 'conehead', row: 4 }, { type: 'newspaper', row: 1 }] },
                { delay: 26, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'newspaper', row: 0 },
                    { type: 'conehead', row: 2 },
                    { type: 'conehead', row: 3 },
                    { type: 'buckethead', row: 4 }
                ]}
            ]
        },
        '2-3': {
            id: '2-3',
            world: 2,
            title: '第 2-3 关：墓碑净化 (墓碑吞噬者登场)',
            bg: 'assets/backgrounds/night_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            tombstones: [{ row: 1, col: 6 }, { row: 2, col: 8 }, { row: 3, col: 7 }],
            allowedPlants: ['puffshroom', 'sunshroom', 'fumeshroom', 'gravebuster', 'wallnut', 'potatomine', 'cherrybomb', 'coffeebean', 'peashooter'],
            rewardPlant: 'hypnoshroom',
            rewardText: '恭喜解锁：魅惑菇！让僵尸啃食后反水倒戈，成为植物军团盟友！',
            waves: [
                { delay: 20, zombies: [{ type: 'normal', row: 3 }] },
                { delay: 22, zombies: [{ type: 'screendoor', row: 2 }] },
                { delay: 22, zombies: [{ type: 'newspaper', row: 1 }, { type: 'conehead', row: 4 }] },
                { delay: 24, zombies: [{ type: 'screendoor', row: 0 }, { type: 'conehead', row: 3 }] },
                { delay: 26, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'screendoor', row: 1 },
                    { type: 'screendoor', row: 3 },
                    { type: 'buckethead', row: 2 },
                    { type: 'newspaper', row: 4 }
                ]}
            ]
        },
        '2-4': {
            id: '2-4',
            world: 2,
            title: '第 2-4 关：心智魅惑 (魅惑菇登场)',
            bg: 'assets/backgrounds/night_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            tombstones: [{ row: 0, col: 7 }, { row: 1, col: 6 }, { row: 3, col: 7 }, { row: 4, col: 8 }],
            allowedPlants: ['puffshroom', 'sunshroom', 'fumeshroom', 'gravebuster', 'hypnoshroom', 'wallnut', 'potatomine', 'cherrybomb', 'coffeebean'],
            rewardPlant: 'scaredyshroom',
            rewardText: '恭喜解锁：胆小菇！超远距离射击，近身抱头缩地！',
            waves: [
                { delay: 20, zombies: [{ type: 'normal', row: 0 }] },
                { delay: 22, zombies: [{ type: 'newspaper', row: 4 }] },
                { delay: 22, zombies: [{ type: 'screendoor', row: 2 }, { type: 'conehead', row: 1 }] },
                { delay: 24, zombies: [{ type: 'screendoor', row: 3 }, { type: 'buckethead', row: 0 }] },
                { delay: 26, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 1 },
                    { type: 'screendoor', row: 4 },
                    { type: 'newspaper', row: 3 },
                    { type: 'conehead', row: 0 }
                ]}
            ]
        },
        '2-5': {
            id: '2-5',
            world: 2,
            title: '第 2-5 关：胆小菇的远距狙击',
            bg: 'assets/backgrounds/night_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            tombstones: [{ row: 0, col: 8 }, { row: 1, col: 7 }, { row: 2, col: 6 }, { row: 3, col: 7 }, { row: 4, col: 8 }],
            allowedPlants: ['puffshroom', 'sunshroom', 'fumeshroom', 'gravebuster', 'hypnoshroom', 'scaredyshroom', 'wallnut', 'potatomine', 'cherrybomb', 'coffeebean'],
            rewardPlant: 'iceshroom',
            rewardText: '恭喜解锁：寒冰菇！瞬间极冻全屏僵尸，深度冰冻与持续减速！',
            waves: [
                { delay: 18, zombies: [{ type: 'normal', row: 2 }] },
                { delay: 20, zombies: [{ type: 'conehead', row: 1 }] },
                { delay: 22, zombies: [{ type: 'screendoor', row: 3 }, { type: 'newspaper', row: 0 }] },
                { delay: 24, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'screendoor', row: 1 },
                    { type: 'buckethead', row: 4 },
                    { type: 'conehead', row: 0 }
                ]},
                { delay: 26, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 2 },
                    { type: 'screendoor', row: 3 },
                    { type: 'newspaper', row: 1 },
                    { type: 'conehead', row: 4 }
                ]}
            ]
        },
        '2-6': {
            id: '2-6',
            world: 2,
            title: '第 2-6 关：极冻深寒 (寒冰菇登场)',
            bg: 'assets/backgrounds/night_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            tombstones: [{ row: 1, col: 7 }, { row: 2, col: 8 }, { row: 4, col: 7 }],
            allowedPlants: ['puffshroom', 'sunshroom', 'fumeshroom', 'gravebuster', 'hypnoshroom', 'scaredyshroom', 'iceshroom', 'wallnut', 'potatomine', 'cherrybomb', 'coffeebean'],
            rewardPlant: 'doomshroom',
            rewardText: '恭喜解锁：毁灭菇！超巨幅范围终极核爆，扫荡一切！',
            waves: [
                { delay: 20, zombies: [{ type: 'normal', row: 2 }] },
                { delay: 22, zombies: [{ type: 'football', row: 1 }] },
                { delay: 22, zombies: [{ type: 'screendoor', row: 3 }, { type: 'newspaper', row: 0 }] },
                { delay: 24, zombies: [{ type: 'football', row: 4 }, { type: 'conehead', row: 2 }] },
                { delay: 26, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'football', row: 1 },
                    { type: 'buckethead', row: 3 },
                    { type: 'screendoor', row: 0 },
                    { type: 'newspaper', row: 4 }
                ]}
            ]
        },
        '2-7': {
            id: '2-7',
            world: 2,
            title: '第 2-7 关：全场极冻 (寒冰菇冰封全场)',
            bg: 'assets/backgrounds/night_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            tombstones: [{ row: 0, col: 7 }, { row: 1, col: 6 }, { row: 3, col: 7 }, { row: 4, col: 6 }],
            allowedPlants: ['puffshroom', 'sunshroom', 'fumeshroom', 'gravebuster', 'hypnoshroom', 'scaredyshroom', 'wallnut', 'potatomine', 'cherrybomb', 'repeater'],
            rewardPlant: 'iceshroom',
            rewardText: '恭喜解锁：寒冰菇！瞬间极冻全屏僵尸，控场王炸！',
            waves: [
                { delay: 20, zombies: [{ type: 'normal', row: 1 }] },
                { delay: 22, zombies: [{ type: 'football', row: 3 }] },
                { delay: 22, zombies: [{ type: 'buckethead', row: 2 }, { type: 'screendoor', row: 0 }] },
                { delay: 24, zombies: [{ type: 'football', row: 4 }, { type: 'newspaper', row: 1 }] },
                { delay: 26, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'football', row: 0 },
                    { type: 'football', row: 4 },
                    { type: 'buckethead', row: 2 },
                    { type: 'screendoor', row: 1 },
                    { type: 'newspaper', row: 3 }
                ]}
            ]
        },
        '2-8': {
            id: '2-8',
            world: 2,
            title: '第 2-8 关：终极核爆 (毁灭菇破阵)',
            bg: 'assets/backgrounds/night_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            tombstones: [{ row: 0, col: 8 }, { row: 1, col: 7 }, { row: 2, col: 7 }, { row: 3, col: 8 }, { row: 4, col: 7 }],
            allowedPlants: ['puffshroom', 'sunshroom', 'fumeshroom', 'gravebuster', 'hypnoshroom', 'scaredyshroom', 'iceshroom', 'wallnut', 'potatomine', 'cherrybomb'],
            rewardPlant: 'doomshroom',
            rewardText: '恭喜解锁：毁灭菇！超巨幅范围毁灭核爆(1800伤害)，扫荡一切！',
            waves: [
                { delay: 20, zombies: [{ type: 'normal', row: 4 }] },
                { delay: 22, zombies: [{ type: 'screendoor', row: 2 }] },
                { delay: 22, zombies: [{ type: 'football', row: 0 }, { type: 'newspaper', row: 3 }] },
                { delay: 24, zombies: [{ type: 'buckethead', row: 1 }, { type: 'football', row: 4 }] },
                { delay: 26, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'football', row: 2 },
                    { type: 'buckethead', row: 0 },
                    { type: 'buckethead', row: 4 },
                    { type: 'screendoor', row: 1 },
                    { type: 'screendoor', row: 3 }
                ]}
            ]
        },
        '2-9': {
            id: '2-9',
            world: 2,
            title: '第 2-9 关：墓地重重 (黑夜大防线)',
            bg: 'assets/backgrounds/night_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            tombstones: [{ row: 0, col: 6 }, { row: 1, col: 7 }, { row: 2, col: 6 }, { row: 3, col: 8 }, { row: 4, col: 7 }],
            allowedPlants: ['puffshroom', 'sunshroom', 'fumeshroom', 'gravebuster', 'hypnoshroom', 'scaredyshroom', 'iceshroom', 'doomshroom', 'wallnut', 'cherrybomb'],
            rewardPlant: 'note',
            rewardText: '缴获僵尸遗落便签：【我们将从后院泳池发起进攻...】！',
            waves: [
                { delay: 18, zombies: [{ type: 'newspaper', row: 2 }] },
                { delay: 20, zombies: [{ type: 'screendoor', row: 1 }] },
                { delay: 22, zombies: [{ type: 'football', row: 3 }, { type: 'conehead', row: 0 }] },
                { delay: 24, zombies: [{ type: 'buckethead', row: 4 }, { type: 'screendoor', row: 2 }] },
                { delay: 26, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'football', row: 1 },
                    { type: 'football', row: 3 },
                    { type: 'screendoor', row: 0 },
                    { type: 'buckethead', row: 4 }
                ]}
            ]
        },
        '2-10': {
            id: '2-10',
            world: 2,
            title: '第 2-10 关：黑夜大决战 (传送带终极大试炼)',
            bg: 'assets/backgrounds/night_viewport.jpg',
            activeRows: [0, 1, 2, 3, 4],
            tombstones: [{ row: 0, col: 7 }, { row: 1, col: 6 }, { row: 2, col: 8 }, { row: 3, col: 6 }, { row: 4, col: 7 }],
            isConveyorBelt: true,
            conveyorCards: ['puffshroom', 'fumeshroom', 'scaredyshroom', 'hypnoshroom', 'iceshroom', 'doomshroom', 'gravebuster', 'wallnut', 'cherrybomb'],
            allowedPlants: ['puffshroom', 'fumeshroom', 'scaredyshroom', 'hypnoshroom', 'iceshroom', 'doomshroom', 'gravebuster', 'wallnut', 'cherrybomb'],
            rewardPlant: 'trophy_night',
            rewardText: '🎉 彻底击退黑夜大军！荣获第二大关荣誉勋章【黑夜银晶向日葵】！🏆',
            waves: [
                { delay: 15, zombies: [{ type: 'newspaper', row: 2 }] },
                { delay: 18, zombies: [{ type: 'screendoor', row: 1 }] },
                { delay: 20, zombies: [{ type: 'football', row: 3 }, { type: 'conehead', row: 4 }] },
                { delay: 22, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'football', row: 1 },
                    { type: 'screendoor', row: 3 },
                    { type: 'buckethead', row: 0 },
                    { type: 'newspaper', row: 4 }
                ]},
                { delay: 25, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'football', row: 0 },
                    { type: 'football', row: 4 },
                    { type: 'buckethead', row: 2 },
                    { type: 'screendoor', row: 1 },
                    { type: 'screendoor', row: 3 }
                ]},
                { delay: 28, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'football', row: 0 },
                    { type: 'football', row: 1 },
                    { type: 'football', row: 2 },
                    { type: 'football', row: 3 },
                    { type: 'football', row: 4 }
                ]}
            ]
        },
        '3-1': {
            id: '3-1',
            world: 3,
            title: '第 3-1 关：碧波荡漾 (泳池初战)',
            bg: 'assets/backgrounds/pool_viewport.jpg',
            isPool: true,
            rowCount: 6,
            waterRows: [2, 3],
            activeRows: [0, 1, 2, 3, 4, 5],
            allowedPlants: ['peashooter', 'sunflower', 'wallnut', 'repeater', 'snowpea', 'lilypad'],
            rewardPlant: 'squash',
            rewardText: '恭喜解锁：窝瓜！跃起压扁靠近的僵尸！',
            waves: [
                { delay: 20, zombies: [{ type: 'normal', row: 1 }] },
                { delay: 22, zombies: [{ type: 'normal', row: 2 }] },
                { delay: 25, zombies: [{ type: 'conehead', row: 4 }] },
                { delay: 25, zombies: [{ type: 'normal', row: 3 }, { type: 'normal', row: 0 }] },
                { delay: 28, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'conehead', row: 1 },
                    { type: 'normal', row: 2 },
                    { type: 'normal', row: 3 },
                    { type: 'conehead', row: 5 }
                ]}
            ]
        },
        '3-2': {
            id: '3-2',
            world: 3,
            title: '第 3-2 关：一跃而过 (撑杆僵尸登场)',
            bg: 'assets/backgrounds/pool_viewport.jpg',
            isPool: true,
            rowCount: 6,
            waterRows: [2, 3],
            activeRows: [0, 1, 2, 3, 4, 5],
            allowedPlants: ['peashooter', 'sunflower', 'wallnut', 'repeater', 'lilypad', 'squash'],
            rewardPlant: 'threepeater',
            rewardText: '恭喜解锁：三线射手！同时覆盖三条航道！',
            waves: [
                { delay: 20, zombies: [{ type: 'normal', row: 0 }] },
                { delay: 22, zombies: [{ type: 'polevault', row: 1 }] },
                { delay: 25, zombies: [{ type: 'normal', row: 2 }, { type: 'conehead', row: 4 }] },
                { delay: 25, zombies: [{ type: 'polevault', row: 5 }, { type: 'normal', row: 3 }] },
                { delay: 28, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'polevault', row: 0 },
                    { type: 'conehead', row: 2 },
                    { type: 'polevault', row: 4 },
                    { type: 'normal', row: 3 },
                    { type: 'conehead', row: 1 }
                ]}
            ]
        },
        '3-3': {
            id: '3-3',
            world: 3,
            title: '第 3-3 关：三路齐射',
            bg: 'assets/backgrounds/pool_viewport.jpg',
            isPool: true,
            rowCount: 6,
            waterRows: [2, 3],
            activeRows: [0, 1, 2, 3, 4, 5],
            allowedPlants: ['peashooter', 'sunflower', 'wallnut', 'repeater', 'lilypad', 'squash', 'threepeater'],
            rewardPlant: 'jalapeno',
            rewardText: '恭喜解锁：火爆辣椒！焚尽整整一整行所有敌人！',
            waves: [
                { delay: 20, zombies: [{ type: 'normal', row: 2 }] },
                { delay: 22, zombies: [{ type: 'polevault', row: 4 }] },
                { delay: 25, zombies: [{ type: 'buckethead', row: 1 }, { type: 'normal', row: 3 }] },
                { delay: 25, zombies: [{ type: 'polevault', row: 0 }, { type: 'conehead', row: 5 }] },
                { delay: 28, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 0 },
                    { type: 'polevault', row: 1 },
                    { type: 'conehead', row: 2 },
                    { type: 'conehead', row: 3 },
                    { type: 'polevault', row: 4 },
                    { type: 'buckethead', row: 5 }
                ]}
            ]
        },
        '3-4': {
            id: '3-4',
            world: 3,
            title: '第 3-4 关：烈焰风暴',
            bg: 'assets/backgrounds/pool_viewport.jpg',
            isPool: true,
            rowCount: 6,
            waterRows: [2, 3],
            activeRows: [0, 1, 2, 3, 4, 5],
            allowedPlants: ['peashooter', 'sunflower', 'wallnut', 'repeater', 'lilypad', 'squash', 'threepeater', 'jalapeno'],
            rewardPlant: 'torchwood',
            rewardText: '恭喜解锁：火炬树桩！让穿过的豌豆变成双倍伤害的烈火！',
            waves: [
                { delay: 18, zombies: [{ type: 'conehead', row: 1 }] },
                { delay: 22, zombies: [{ type: 'buckethead', row: 4 }] },
                { delay: 22, zombies: [{ type: 'polevault', row: 0 }, { type: 'normal', row: 2 }] },
                { delay: 25, zombies: [{ type: 'polevault', row: 5 }, { type: 'buckethead', row: 3 }] },
                { delay: 28, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 1 },
                    { type: 'buckethead', row: 4 },
                    { type: 'polevault', row: 0 },
                    { type: 'polevault', row: 5 },
                    { type: 'conehead', row: 2 },
                    { type: 'conehead', row: 3 }
                ]}
            ]
        },
        '3-5': {
            id: '3-5',
            world: 3,
            title: '第 3-5 关：燃烧的豌豆',
            bg: 'assets/backgrounds/pool_viewport.jpg',
            isPool: true,
            rowCount: 6,
            waterRows: [2, 3],
            activeRows: [0, 1, 2, 3, 4, 5],
            allowedPlants: ['peashooter', 'sunflower', 'wallnut', 'repeater', 'lilypad', 'squash', 'threepeater', 'jalapeno', 'torchwood'],
            rewardPlant: 'tallnut',
            rewardText: '恭喜解锁：高坚果！超强8000耐久，彻底拦截撑杆跳僵尸！',
            waves: [
                { delay: 18, zombies: [{ type: 'normal', row: 2 }] },
                { delay: 20, zombies: [{ type: 'polevault', row: 1 }, { type: 'conehead', row: 4 }] },
                { delay: 22, zombies: [{ type: 'buckethead', row: 0 }, { type: 'polevault', row: 5 }] },
                { delay: 25, zombies: [{ type: 'buckethead', row: 3 }, { type: 'conehead', row: 2 }] },
                { delay: 28, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'football', row: 1 },
                    { type: 'football', row: 4 },
                    { type: 'polevault', row: 0 },
                    { type: 'polevault', row: 5 },
                    { type: 'buckethead', row: 2 },
                    { type: 'buckethead', row: 3 }
                ]}
            ]
        },
        '3-6': {
            id: '3-6',
            world: 3,
            title: '第 3-6 关：巍峨天堑 (高坚果防线)',
            bg: 'assets/backgrounds/pool_viewport.jpg',
            isPool: true,
            rowCount: 6,
            waterRows: [2, 3],
            activeRows: [0, 1, 2, 3, 4, 5],
            allowedPlants: ['peashooter', 'sunflower', 'tallnut', 'repeater', 'lilypad', 'squash', 'threepeater', 'jalapeno', 'torchwood'],
            rewardPlant: 'spikeweed',
            rewardText: '防守固若金汤！高坚果坚不可摧！',
            waves: [
                { delay: 18, zombies: [{ type: 'polevault', row: 0 }] },
                { delay: 20, zombies: [{ type: 'polevault', row: 1 }, { type: 'polevault', row: 4 }] },
                { delay: 22, zombies: [{ type: 'football', row: 5 }, { type: 'buckethead', row: 2 }] },
                { delay: 25, zombies: [{ type: 'polevault', row: 0 }, { type: 'buckethead', row: 3 }] },
                { delay: 28, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'polevault', row: 0 },
                    { type: 'polevault', row: 1 },
                    { type: 'polevault', row: 4 },
                    { type: 'polevault', row: 5 },
                    { type: 'football', row: 2 },
                    { type: 'football', row: 3 }
                ]}
            ]
        },
        '3-7': {
            id: '3-7',
            world: 3,
            title: '第 3-7 关：水陆双向合围',
            bg: 'assets/backgrounds/pool_viewport.jpg',
            isPool: true,
            rowCount: 6,
            waterRows: [2, 3],
            activeRows: [0, 1, 2, 3, 4, 5],
            allowedPlants: ['peashooter', 'sunflower', 'tallnut', 'repeater', 'lilypad', 'squash', 'threepeater', 'jalapeno', 'torchwood'],
            rewardPlant: 'starfruit',
            rewardText: '水陆防线完美协同！',
            waves: [
                { delay: 18, zombies: [{ type: 'conehead', row: 2 }] },
                { delay: 20, zombies: [{ type: 'buckethead', row: 3 }, { type: 'polevault', row: 1 }] },
                { delay: 22, zombies: [{ type: 'screendoor', row: 0 }, { type: 'football', row: 4 }] },
                { delay: 25, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'buckethead', row: 2 },
                    { type: 'buckethead', row: 3 },
                    { type: 'football', row: 1 },
                    { type: 'football', row: 4 },
                    { type: 'polevault', row: 0 },
                    { type: 'polevault', row: 5 }
                ]}
            ]
        },
        '3-8': {
            id: '3-8',
            world: 3,
            title: '第 3-8 关：碧水惊涛',
            bg: 'assets/backgrounds/pool_viewport.jpg',
            isPool: true,
            rowCount: 6,
            waterRows: [2, 3],
            activeRows: [0, 1, 2, 3, 4, 5],
            allowedPlants: ['peashooter', 'sunflower', 'tallnut', 'repeater', 'lilypad', 'squash', 'threepeater', 'jalapeno', 'torchwood'],
            rewardPlant: 'pumpkin',
            rewardText: '顶住惊涛骇浪！向终极决战进军！',
            waves: [
                { delay: 16, zombies: [{ type: 'polevault', row: 4 }] },
                { delay: 18, zombies: [{ type: 'football', row: 1 }, { type: 'buckethead', row: 2 }] },
                { delay: 20, zombies: [{ type: 'screendoor', row: 3 }, { type: 'polevault', row: 5 }] },
                { delay: 22, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'football', row: 0 },
                    { type: 'football', row: 5 },
                    { type: 'buckethead', row: 2 },
                    { type: 'buckethead', row: 3 },
                    { type: 'polevault', row: 1 },
                    { type: 'polevault', row: 4 }
                ]}
            ]
        },
        '3-9': {
            id: '3-9',
            world: 3,
            title: '第 3-9 关：决战前夜',
            bg: 'assets/backgrounds/pool_viewport.jpg',
            isPool: true,
            rowCount: 6,
            waterRows: [2, 3],
            activeRows: [0, 1, 2, 3, 4, 5],
            allowedPlants: ['peashooter', 'sunflower', 'tallnut', 'repeater', 'lilypad', 'squash', 'threepeater', 'jalapeno', 'torchwood'],
            rewardPlant: 'magnetshroom',
            rewardText: '坚如磐石！准备迎接泳池终极大考！',
            waves: [
                { delay: 16, zombies: [{ type: 'football', row: 2 }] },
                { delay: 18, zombies: [{ type: 'polevault', row: 0 }, { type: 'polevault', row: 5 }] },
                { delay: 20, zombies: [{ type: 'screendoor', row: 1 }, { type: 'screendoor', row: 4 }] },
                { delay: 22, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'football', row: 0 },
                    { type: 'football', row: 2 },
                    { type: 'football', row: 3 },
                    { type: 'football', row: 5 },
                    { type: 'polevault', row: 1 },
                    { type: 'polevault', row: 4 }
                ]}
            ]
        },
        '3-10': {
            id: '3-10',
            world: 3,
            title: '第 3-10 关：碧波大决战 (传送带终极大试炼)',
            bg: 'assets/backgrounds/pool_viewport.jpg',
            isPool: true,
            rowCount: 6,
            waterRows: [2, 3],
            activeRows: [0, 1, 2, 3, 4, 5],
            isConveyorBelt: true,
            conveyorCards: ['threepeater', 'repeater', 'peashooter', 'torchwood', 'lilypad', 'squash', 'jalapeno', 'tallnut', 'wallnut'],
            allowedPlants: ['threepeater', 'repeater', 'peashooter', 'torchwood', 'lilypad', 'squash', 'jalapeno', 'tallnut', 'wallnut'],
            rewardPlant: 'trophy_pool',
            rewardText: '🎉 彻底征服泳池！荣获第三大关荣誉勋章【海蓝宝水晶向日葵】！🏆',
            waves: [
                { delay: 15, zombies: [{ type: 'polevault', row: 1 }] },
                { delay: 18, zombies: [{ type: 'buckethead', row: 2 }, { type: 'conehead', row: 4 }] },
                { delay: 20, zombies: [{ type: 'football', row: 3 }, { type: 'polevault', row: 5 }] },
                { delay: 22, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'football', row: 1 },
                    { type: 'screendoor', row: 4 },
                    { type: 'buckethead', row: 2 },
                    { type: 'buckethead', row: 3 },
                    { type: 'polevault', row: 0 },
                    { type: 'polevault', row: 5 }
                ]},
                { delay: 25, isFlag: true, zombies: [
                    { type: 'flag', row: 2 },
                    { type: 'football', row: 0 },
                    { type: 'football', row: 5 },
                    { type: 'football', row: 2 },
                    { type: 'football', row: 3 },
                    { type: 'polevault', row: 1 },
                    { type: 'polevault', row: 4 },
                    { type: 'buckethead', row: 1 },
                    { type: 'buckethead', row: 4 }
                ]}
            ]
        }        ,
        "4-1": {
            "id": "4-1",
            "world": 4,
            "title": "第 4-1 关：浓雾笼罩 (初探迷雾)",
            "bg": "assets/backgrounds/fog_viewport.jpg",
            "isPool": true,
            "isFog": true,
            "rowCount": 6,
            "waterRows": [
                        2,
                        3
            ],
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4,
                        5
            ],
            "allowedPlants": [
                        "puffshroom",
                        "sunshroom",
                        "fumeshroom",
                        "lilypad",
                        "wallnut",
                        "repeater"
            ],
            "rewardPlant": "seashroom",
            "rewardText": "恭喜解锁：海蘑菇！免费水生喷射蘑菇！",
            "waves": [
                        {
                                    "delay": 20,
                                    "zombies": [
                                                {
                                                            "type": "normal",
                                                            "row": 1
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "zombies": [
                                                {
                                                            "type": "normal",
                                                            "row": 2
                                                }
                                    ]
                        },
                        {
                                    "delay": 25,
                                    "zombies": [
                                                {
                                                            "type": "conehead",
                                                            "row": 4
                                                }
                                    ]
                        },
                        {
                                    "delay": 28,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "conehead",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "normal",
                                                            "row": 3
                                                },
                                                {
                                                            "type": "conehead",
                                                            "row": 5
                                                }
                                    ]
                        }
            ]
}        ,
        "4-2": {
            "id": "4-2",
            "world": 4,
            "title": "第 4-2 关：隐秘杀机 (水生奇兵)",
            "bg": "assets/backgrounds/fog_viewport.jpg",
            "isPool": true,
            "isFog": true,
            "rowCount": 6,
            "waterRows": [
                        2,
                        3
            ],
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4,
                        5
            ],
            "allowedPlants": [
                        "puffshroom",
                        "sunshroom",
                        "seashroom",
                        "lilypad",
                        "wallnut",
                        "repeater"
            ],
            "rewardPlant": "starfruit",
            "rewardText": "恭喜解锁：星星果！向 5 个方向发射飞星！",
            "waves": [
                        {
                                    "delay": 20,
                                    "zombies": [
                                                {
                                                            "type": "normal",
                                                            "row": 2
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "zombies": [
                                                {
                                                            "type": "polevault",
                                                            "row": 1
                                                }
                                    ]
                        },
                        {
                                    "delay": 25,
                                    "zombies": [
                                                {
                                                            "type": "buckethead",
                                                            "row": 4
                                                },
                                                {
                                                            "type": "normal",
                                                            "row": 3
                                                }
                                    ]
                        },
                        {
                                    "delay": 28,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "polevault",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "conehead",
                                                            "row": 4
                                                }
                                    ]
                        }
            ]
}        ,
        "4-3": {
            "id": "4-3",
            "world": 4,
            "title": "第 4-3 关：五向齐发",
            "bg": "assets/backgrounds/fog_viewport.jpg",
            "isPool": true,
            "isFog": true,
            "rowCount": 6,
            "waterRows": [
                        2,
                        3
            ],
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4,
                        5
            ],
            "allowedPlants": [
                        "puffshroom",
                        "sunshroom",
                        "seashroom",
                        "starfruit",
                        "lilypad",
                        "wallnut"
            ],
            "rewardPlant": "pumpkin",
            "rewardText": "恭喜解锁：南瓜头！可套在任何植物外层提供4000点护甲！",
            "waves": [
                        {
                                    "delay": 20,
                                    "zombies": [
                                                {
                                                            "type": "conehead",
                                                            "row": 0
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "zombies": [
                                                {
                                                            "type": "screendoor",
                                                            "row": 4
                                                }
                                    ]
                        },
                        {
                                    "delay": 25,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "normal",
                                                            "row": 2
                                                }
                                    ]
                        },
                        {
                                    "delay": 28,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 5
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 3
                                                }
                                    ]
                        }
            ]
}        ,
        "4-4": {
            "id": "4-4",
            "world": 4,
            "title": "第 4-4 关：南瓜甲胄",
            "bg": "assets/backgrounds/fog_viewport.jpg",
            "isPool": true,
            "isFog": true,
            "rowCount": 6,
            "waterRows": [
                        2,
                        3
            ],
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4,
                        5
            ],
            "allowedPlants": [
                        "puffshroom",
                        "sunshroom",
                        "seashroom",
                        "starfruit",
                        "pumpkin",
                        "lilypad"
            ],
            "rewardPlant": "magnetshroom",
            "rewardText": "恭喜解锁：磁力菇！吸走僵尸的铁桶、铁门与头盔！",
            "waves": [
                        {
                                    "delay": 18,
                                    "zombies": [
                                                {
                                                            "type": "buckethead",
                                                            "row": 1
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "zombies": [
                                                {
                                                            "type": "screendoor",
                                                            "row": 4
                                                }
                                    ]
                        },
                        {
                                    "delay": 25,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "polevault",
                                                            "row": 5
                                                }
                                    ]
                        },
                        {
                                    "delay": 28,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 3
                                                }
                                    ]
                        }
            ]
}        ,
        "4-5": {
            "id": "4-5",
            "world": 4,
            "title": "第 4-5 关：磁力神威",
            "bg": "assets/backgrounds/fog_viewport.jpg",
            "isPool": true,
            "isFog": true,
            "rowCount": 6,
            "waterRows": [
                        2,
                        3
            ],
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4,
                        5
            ],
            "allowedPlants": [
                        "puffshroom",
                        "sunshroom",
                        "seashroom",
                        "starfruit",
                        "pumpkin",
                        "magnetshroom",
                        "lilypad"
            ],
            "rewardPlant": "blover",
            "rewardText": "恭喜解锁：三叶草！瞬间刮起狂风吹散浓雾！",
            "waves": [
                        {
                                    "delay": 18,
                                    "zombies": [
                                                {
                                                            "type": "screendoor",
                                                            "row": 1
                                                }
                                    ]
                        },
                        {
                                    "delay": 20,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "zombies": [
                                                {
                                                            "type": "buckethead",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "polevault",
                                                            "row": 0
                                                }
                                    ]
                        },
                        {
                                    "delay": 28,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 5
                                                }
                                    ]
                        }
            ]
}        ,
        "4-6": {
            "id": "4-6",
            "world": 4,
            "title": "第 4-6 关：狂风骤起",
            "bg": "assets/backgrounds/fog_viewport.jpg",
            "isPool": true,
            "isFog": true,
            "rowCount": 6,
            "waterRows": [
                        2,
                        3
            ],
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4,
                        5
            ],
            "allowedPlants": [
                        "puffshroom",
                        "sunshroom",
                        "seashroom",
                        "starfruit",
                        "pumpkin",
                        "magnetshroom",
                        "blover",
                        "lilypad"
            ],
            "rewardPlant": "coffeebean",
            "rewardText": "迷雾中风雷涌动！",
            "waves": [
                        {
                                    "delay": 16,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                }
                                    ]
                        },
                        {
                                    "delay": 18,
                                    "zombies": [
                                                {
                                                            "type": "polevault",
                                                            "row": 5
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 2
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 3
                                                },
                                                {
                                                            "type": "polevault",
                                                            "row": 4
                                                }
                                    ]
                        }
            ]
}        ,
        "4-7": {
            "id": "4-7",
            "world": 4,
            "title": "第 4-7 关：雾里看花",
            "bg": "assets/backgrounds/fog_viewport.jpg",
            "isPool": true,
            "isFog": true,
            "rowCount": 6,
            "waterRows": [
                        2,
                        3
            ],
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4,
                        5
            ],
            "allowedPlants": [
                        "puffshroom",
                        "sunshroom",
                        "seashroom",
                        "starfruit",
                        "pumpkin",
                        "magnetshroom",
                        "blover",
                        "lilypad"
            ],
            "rewardPlant": "doomshroom",
            "rewardText": "阵线坚如钢铁！",
            "waves": [
                        {
                                    "delay": 16,
                                    "zombies": [
                                                {
                                                            "type": "screendoor",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 4
                                                }
                                    ]
                        },
                        {
                                    "delay": 18,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 3
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 5
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 4
                                                }
                                    ]
                        }
            ]
}        ,
        "4-8": {
            "id": "4-8",
            "world": 4,
            "title": "第 4-8 关：迷雾暗流",
            "bg": "assets/backgrounds/fog_viewport.jpg",
            "isPool": true,
            "isFog": true,
            "rowCount": 6,
            "waterRows": [
                        2,
                        3
            ],
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4,
                        5
            ],
            "allowedPlants": [
                        "puffshroom",
                        "sunshroom",
                        "seashroom",
                        "starfruit",
                        "pumpkin",
                        "magnetshroom",
                        "blover",
                        "lilypad"
            ],
            "rewardPlant": "jalapeno",
            "rewardText": "暗流汹涌！向终极试炼进发！",
            "waves": [
                        {
                                    "delay": 16,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 2
                                                }
                                    ]
                        },
                        {
                                    "delay": 18,
                                    "zombies": [
                                                {
                                                            "type": "polevault",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 5
                                                }
                                    ]
                        }
            ]
}        ,
        "4-9": {
            "id": "4-9",
            "world": 4,
            "title": "第 4-9 关：终战前夕",
            "bg": "assets/backgrounds/fog_viewport.jpg",
            "isPool": true,
            "isFog": true,
            "rowCount": 6,
            "waterRows": [
                        2,
                        3
            ],
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4,
                        5
            ],
            "allowedPlants": [
                        "puffshroom",
                        "sunshroom",
                        "seashroom",
                        "starfruit",
                        "pumpkin",
                        "magnetshroom",
                        "blover",
                        "lilypad"
            ],
            "rewardPlant": "cherrybomb",
            "rewardText": "浓雾即将消散！准备大决战！",
            "waves": [
                        {
                                    "delay": 16,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 4
                                                }
                                    ]
                        },
                        {
                                    "delay": 18,
                                    "zombies": [
                                                {
                                                            "type": "buckethead",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 3
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 3
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 5
                                                },
                                                {
                                                            "type": "polevault",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "polevault",
                                                            "row": 4
                                                }
                                    ]
                        }
            ]
}        ,
        "4-10": {
            "id": "4-10",
            "world": 4,
            "title": "第 4-10 关：浓雾大决战 (传送带终极大试炼)",
            "bg": "assets/backgrounds/fog_viewport.jpg",
            "isPool": true,
            "isFog": true,
            "rowCount": 6,
            "waterRows": [
                        2,
                        3
            ],
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4,
                        5
            ],
            "isConveyorBelt": true,
            "conveyorCards": [
                        "starfruit",
                        "fumeshroom",
                        "puffshroom",
                        "seashroom",
                        "pumpkin",
                        "magnetshroom",
                        "blover",
                        "lilypad",
                        "hypnoshroom"
            ],
            "allowedPlants": [
                        "starfruit",
                        "fumeshroom",
                        "puffshroom",
                        "seashroom",
                        "pumpkin",
                        "magnetshroom",
                        "blover",
                        "lilypad",
                        "hypnoshroom"
            ],
            "rewardPlant": "trophy_fog",
            "rewardText": "🎉 彻底驱散无尽浓雾！荣获第四大关荣誉勋章【紫晶幽夜向日葵】！🏆",
            "waves": [
                        {
                                    "delay": 15,
                                    "zombies": [
                                                {
                                                            "type": "screendoor",
                                                            "row": 1
                                                }
                                    ]
                        },
                        {
                                    "delay": 18,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 2
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 4
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 5
                                                }
                                    ]
                        },
                        {
                                    "delay": 25,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 3
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 5
                                                }
                                    ]
                        }
            ]
}        ,
        "5-1": {
            "id": "5-1",
            "world": 5,
            "title": "第 5-1 关：登高远望 (屋顶初战)",
            "bg": "assets/backgrounds/roof_viewport.jpg",
            "isRoof": true,
            "rowCount": 5,
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4
            ],
            "allowedPlants": [
                        "flowerpot",
                        "cabbagepult",
                        "sunflower",
                        "wallnut",
                        "repeater"
            ],
            "rewardPlant": "kernelpult",
            "rewardText": "恭喜解锁：玉米投手！投掷玉米与定身黄油！",
            "waves": [
                        {
                                    "delay": 20,
                                    "zombies": [
                                                {
                                                            "type": "normal",
                                                            "row": 2
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "zombies": [
                                                {
                                                            "type": "normal",
                                                            "row": 1
                                                }
                                    ]
                        },
                        {
                                    "delay": 25,
                                    "zombies": [
                                                {
                                                            "type": "conehead",
                                                            "row": 3
                                                }
                                    ]
                        },
                        {
                                    "delay": 28,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "conehead",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "normal",
                                                            "row": 4
                                                }
                                    ]
                        }
            ]
}        ,
        "5-2": {
            "id": "5-2",
            "world": 5,
            "title": "第 5-2 关：黄油定身",
            "bg": "assets/backgrounds/roof_viewport.jpg",
            "isRoof": true,
            "rowCount": 5,
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4
            ],
            "allowedPlants": [
                        "flowerpot",
                        "cabbagepult",
                        "kernelpult",
                        "sunflower",
                        "wallnut"
            ],
            "rewardPlant": "garlic",
            "rewardText": "恭喜解锁：大蒜！让僵尸换行避开！",
            "waves": [
                        {
                                    "delay": 20,
                                    "zombies": [
                                                {
                                                            "type": "normal",
                                                            "row": 1
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "zombies": [
                                                {
                                                            "type": "polevault",
                                                            "row": 3
                                                }
                                    ]
                        },
                        {
                                    "delay": 25,
                                    "zombies": [
                                                {
                                                            "type": "conehead",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 4
                                                }
                                    ]
                        },
                        {
                                    "delay": 28,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "conehead",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 3
                                                },
                                                {
                                                            "type": "polevault",
                                                            "row": 4
                                                }
                                    ]
                        }
            ]
}        ,
        "5-3": {
            "id": "5-3",
            "world": 5,
            "title": "第 5-3 关：辛辣换道",
            "bg": "assets/backgrounds/roof_viewport.jpg",
            "isRoof": true,
            "rowCount": 5,
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4
            ],
            "allowedPlants": [
                        "flowerpot",
                        "cabbagepult",
                        "kernelpult",
                        "garlic",
                        "sunflower",
                        "wallnut"
            ],
            "rewardPlant": "melonpult",
            "rewardText": "恭喜解锁：西瓜投手！超强80伤害与群伤溅射！",
            "waves": [
                        {
                                    "delay": 18,
                                    "zombies": [
                                                {
                                                            "type": "conehead",
                                                            "row": 2
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "zombies": [
                                                {
                                                            "type": "screendoor",
                                                            "row": 1
                                                }
                                    ]
                        },
                        {
                                    "delay": 25,
                                    "zombies": [
                                                {
                                                            "type": "buckethead",
                                                            "row": 3
                                                },
                                                {
                                                            "type": "polevault",
                                                            "row": 0
                                                }
                                    ]
                        },
                        {
                                    "delay": 28,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 4
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 2
                                                }
                                    ]
                        }
            ]
}        ,
        "5-4": {
            "id": "5-4",
            "world": 5,
            "title": "第 5-4 关：碧玉飞瓜",
            "bg": "assets/backgrounds/roof_viewport.jpg",
            "isRoof": true,
            "rowCount": 5,
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4
            ],
            "allowedPlants": [
                        "flowerpot",
                        "cabbagepult",
                        "kernelpult",
                        "garlic",
                        "melonpult",
                        "sunflower",
                        "wallnut"
            ],
            "rewardPlant": "tallnut",
            "rewardText": "高空重炮防线大成！",
            "waves": [
                        {
                                    "delay": 18,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 1
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "zombies": [
                                                {
                                                            "type": "buckethead",
                                                            "row": 3
                                                }
                                    ]
                        },
                        {
                                    "delay": 25,
                                    "zombies": [
                                                {
                                                            "type": "screendoor",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                }
                                    ]
                        },
                        {
                                    "delay": 28,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 3
                                                }
                                    ]
                        }
            ]
}        ,
        "5-5": {
            "id": "5-5",
            "world": 5,
            "title": "第 5-5 关：瓦顶坚壁",
            "bg": "assets/backgrounds/roof_viewport.jpg",
            "isRoof": true,
            "rowCount": 5,
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4
            ],
            "allowedPlants": [
                        "flowerpot",
                        "cabbagepult",
                        "kernelpult",
                        "melonpult",
                        "garlic",
                        "tallnut",
                        "sunflower"
            ],
            "rewardPlant": "squash",
            "rewardText": "防守密不透风！",
            "waves": [
                        {
                                    "delay": 18,
                                    "zombies": [
                                                {
                                                            "type": "polevault",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "polevault",
                                                            "row": 4
                                                }
                                    ]
                        },
                        {
                                    "delay": 20,
                                    "zombies": [
                                                {
                                                            "type": "screendoor",
                                                            "row": 2
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 3
                                                }
                                    ]
                        },
                        {
                                    "delay": 28,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 3
                                                }
                                    ]
                        }
            ]
}        ,
        "5-6": {
            "id": "5-6",
            "world": 5,
            "title": "第 5-6 关：天台交锋",
            "bg": "assets/backgrounds/roof_viewport.jpg",
            "isRoof": true,
            "rowCount": 5,
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4
            ],
            "allowedPlants": [
                        "flowerpot",
                        "cabbagepult",
                        "kernelpult",
                        "melonpult",
                        "garlic",
                        "tallnut",
                        "sunflower"
            ],
            "rewardPlant": "jalapeno",
            "rewardText": "横扫强敌！",
            "waves": [
                        {
                                    "delay": 16,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 2
                                                }
                                    ]
                        },
                        {
                                    "delay": 18,
                                    "zombies": [
                                                {
                                                            "type": "screendoor",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 4
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 3
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 4
                                                }
                                    ]
                        }
            ]
}        ,
        "5-7": {
            "id": "5-7",
            "world": 5,
            "title": "第 5-7 关：重炮齐鸣",
            "bg": "assets/backgrounds/roof_viewport.jpg",
            "isRoof": true,
            "rowCount": 5,
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4
            ],
            "allowedPlants": [
                        "flowerpot",
                        "cabbagepult",
                        "kernelpult",
                        "melonpult",
                        "garlic",
                        "tallnut",
                        "sunflower"
            ],
            "rewardPlant": "cherrybomb",
            "rewardText": "火力覆盖全场！",
            "waves": [
                        {
                                    "delay": 16,
                                    "zombies": [
                                                {
                                                            "type": "buckethead",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 3
                                                }
                                    ]
                        },
                        {
                                    "delay": 18,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 3
                                                }
                                    ]
                        }
            ]
}        ,
        "5-8": {
            "id": "5-8",
            "world": 5,
            "title": "第 5-8 关：决胜屋脊",
            "bg": "assets/backgrounds/roof_viewport.jpg",
            "isRoof": true,
            "rowCount": 5,
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4
            ],
            "allowedPlants": [
                        "flowerpot",
                        "cabbagepult",
                        "kernelpult",
                        "melonpult",
                        "garlic",
                        "tallnut",
                        "sunflower"
            ],
            "rewardPlant": "torchwood",
            "rewardText": "胜利近在咫尺！",
            "waves": [
                        {
                                    "delay": 16,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 3
                                                }
                                    ]
                        },
                        {
                                    "delay": 18,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 3
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 4
                                                }
                                    ]
                        }
            ]
}        ,
        "5-9": {
            "id": "5-9",
            "world": 5,
            "title": "第 5-9 关：决战前夜",
            "bg": "assets/backgrounds/roof_viewport.jpg",
            "isRoof": true,
            "rowCount": 5,
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4
            ],
            "allowedPlants": [
                        "flowerpot",
                        "cabbagepult",
                        "kernelpult",
                        "melonpult",
                        "garlic",
                        "tallnut",
                        "sunflower"
            ],
            "rewardPlant": "starfruit",
            "rewardText": "全军集结，准备终极大决战！",
            "waves": [
                        {
                                    "delay": 15,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 2
                                                }
                                    ]
                        },
                        {
                                    "delay": 18,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 3
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                }
                                    ]
                        }
            ]
}        ,
        "5-10": {
            "id": "5-10",
            "world": 5,
            "title": "第 5-10 关：屋顶终极大决战 (全通关最终试炼)",
            "bg": "assets/backgrounds/roof_viewport.jpg",
            "isRoof": true,
            "rowCount": 5,
            "activeRows": [
                        0,
                        1,
                        2,
                        3,
                        4
            ],
            "isConveyorBelt": true,
            "conveyorCards": [
                        "flowerpot",
                        "melonpult",
                        "kernelpult",
                        "cabbagepult",
                        "tallnut",
                        "squash",
                        "jalapeno",
                        "cherrybomb",
                        "garlic"
            ],
            "allowedPlants": [
                        "flowerpot",
                        "melonpult",
                        "kernelpult",
                        "cabbagepult",
                        "tallnut",
                        "squash",
                        "jalapeno",
                        "cherrybomb",
                        "garlic"
            ],
            "rewardPlant": "trophy_roof",
            "rewardText": "👑 全通关大满贯！终极守护成功！荣获全游戏最高荣誉【黄金向日葵大奖杯】！🏆✨",
            "waves": [
                        {
                                    "delay": 15,
                                    "zombies": [
                                                {
                                                            "type": "football",
                                                            "row": 1
                                                }
                                    ]
                        },
                        {
                                    "delay": 18,
                                    "zombies": [
                                                {
                                                            "type": "screendoor",
                                                            "row": 3
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 2
                                                }
                                    ]
                        },
                        {
                                    "delay": 22,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "screendoor",
                                                            "row": 3
                                                }
                                    ]
                        },
                        {
                                    "delay": 25,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 3
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                }
                                    ]
                        },
                        {
                                    "delay": 28,
                                    "isFlag": true,
                                    "zombies": [
                                                {
                                                            "type": "flag",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 1
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 2
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 3
                                                },
                                                {
                                                            "type": "football",
                                                            "row": 4
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 0
                                                },
                                                {
                                                            "type": "buckethead",
                                                            "row": 4
                                                }
                                    ]
                        }
            ]
}
    }
};

// 12款可爱萌宠头像 (完全对标 shuxue)
export const AVATAR_LIST = ['🐰', '🐸', '🐱', '🐶', '🐼', '🦊', '🐯', '🦁', '🐻', '🐨', '🐵', '🦄'];

// 预设学段配置
export const DIFFICULTY_PRESETS = {
    grade1_2: {
        id: 'grade1_2',
        name: '🌱 萌芽学徒 (1~2年级)',
        desc: '10/20以内加减法、整十加减、凑数填空 (防负数)'
    },
    grade3_4: {
        id: 'grade3_4',
        name: '⚡ 数灵法师 (3~4年级)',
        desc: '九九乘法表、表内除法、百以内加减速算 (整除)'
    },
    grade5_6: {
        id: 'grade5_6',
        name: '🔥 大奥术师 (5~6年级)',
        desc: '四则混合两步运算、优先级法则、简算巧算'
    }
};
