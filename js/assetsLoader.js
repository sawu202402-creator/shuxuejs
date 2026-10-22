/**
 * assetsLoader.js - 资源预加载与标准化资产字典管理器
 */

class AssetsLoader {
    constructor() {
        this.cache = new Map();
        this.totalCount = 0;
        this.loadedCount = 0;
        this.failedCount = 0;
    }

    /**
     * 批量预加载资源列表
     * @param {string[]} paths 
     * @param {function} onProgress (loaded, total, percent)
     * @returns {Promise<boolean>}
     */
    async preloadAll(paths, onProgress = null) {
        const uniquePaths = [...new Set(paths.filter(p => p && typeof p === 'string'))];
        this.totalCount = uniquePaths.length;
        this.loadedCount = 0;
        this.failedCount = 0;

        const promises = uniquePaths.map(path => this.loadImage(path, onProgress));
        await Promise.all(promises);
        return true;
    }

    /**
     * 单张图片加载
     */
    loadImage(src, onProgress = null) {
        return new Promise((resolve) => {
            if (this.cache.has(src)) {
                resolve(this.cache.get(src));
                return;
            }

            const img = new Image();
            img.onload = () => {
                this.cache.set(src, img);
                this.loadedCount++;
                if (onProgress) {
                    onProgress(this.loadedCount, this.totalCount, Math.floor((this.loadedCount / this.totalCount) * 100));
                }
                resolve(img);
            };

            img.onerror = () => {
                console.warn(`[AssetsLoader] Asset failed to load: ${src}, generating fallback`);
                this.failedCount++;
                this.loadedCount++;
                // 生产兜底占位图，确保程序绝不中断崩溃
                const fallbackCanvas = document.createElement('canvas');
                fallbackCanvas.width = 64;
                fallbackCanvas.height = 64;
                const ctx = fallbackCanvas.getContext('2d');
                ctx.fillStyle = '#2ecc71';
                ctx.fillRect(0, 0, 64, 64);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 20px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🌱', 32, 32);

                const fallbackImg = new Image();
                fallbackImg.src = fallbackCanvas.toDataURL();
                this.cache.set(src, fallbackImg);

                if (onProgress) {
                    onProgress(this.loadedCount, this.totalCount, Math.floor((this.loadedCount / this.totalCount) * 100));
                }
                resolve(fallbackImg);
            };

            img.src = src;
        });
    }

    /**
     * 同步获取已缓存图像
     */
    getImage(src) {
        if (!src) return null;
        if (this.cache.has(src)) {
            return this.cache.get(src);
        }
        // 如果未加载，尝试触发异步加载并先返回 null
        this.loadImage(src);
        return null;
    }

    /**
     * 判断某资源是否已加载完成
     */
    isLoaded(src) {
        return this.cache.has(src);
    }
}

export const assetsLoader = new AssetsLoader();
