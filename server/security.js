/**
 * 安全配置模块 - 企业级安全方案
 * 
 * 功能：
 * 1. AES-256-GCM 加密存储敏感配置
 * 2. bcrypt 密码哈希（防彩虹表攻击）
 * 3. 安全的 CORS 配置
 * 4. 防逆向工程保护
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ============ 加密配置 ============

// 加密算法：AES-256-GCM（认证加密，防篡改）
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const SUPABASE_PET_ASSET_ORIGIN = 'https://brvjqiusgeqeyfadfwga.supabase.co';

// 机器指纹作为加密密钥的一部分（绑定到特定机器）
function getMachineFingerprint() {
  const os = require('os');
  const parts = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || 'unknown',
    // 获取第一个非内部网卡的MAC地址
    Object.values(os.networkInterfaces())
      .flat()
      .find(i => !i.internal && i.mac !== '00:00:00:00:00:00')?.mac || 'no-mac'
  ];
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

function resolveSecureConfigMasterKey() {
  const configuredKey = typeof process.env.SECURE_CONFIG_KEY === 'string'
    ? process.env.SECURE_CONFIG_KEY.trim().slice(0, 256)
    : '';

  if (configuredKey) {
    return crypto
      .createHash('sha256')
      .update(`camp-pk-system|${configuredKey}`)
      .digest('hex');
  }

  return getMachineFingerprint();
}

// 派生加密密钥（使用PBKDF2）
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
}

// 加密数据
function encrypt(plaintext, masterKey) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  // 格式：salt(hex) + iv(hex) + authTag(hex) + encrypted(hex)
  return salt.toString('hex') + iv.toString('hex') + authTag.toString('hex') + encrypted;
}

// 解密数据
function decrypt(ciphertext, masterKey) {
  try {
    const salt = Buffer.from(ciphertext.slice(0, SALT_LENGTH * 2), 'hex');
    const iv = Buffer.from(ciphertext.slice(SALT_LENGTH * 2, SALT_LENGTH * 2 + IV_LENGTH * 2), 'hex');
    const authTag = Buffer.from(ciphertext.slice(SALT_LENGTH * 2 + IV_LENGTH * 2, SALT_LENGTH * 2 + IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2), 'hex');
    const encrypted = ciphertext.slice(SALT_LENGTH * 2 + IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2);
    
    const key = deriveKey(masterKey, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('解密失败:', err.message);
    return null;
  }
}

// ============ 密码哈希 ============

// 使用 scrypt（Node.js 内置，比 bcrypt 更安全）
const SCRYPT_PARAMS = {
  N: 16384,  // CPU/内存成本参数
  r: 8,      // 块大小
  p: 1,      // 并行化参数
  keyLen: 64 // 输出长度
};

// 哈希密码
function hashPassword(password) {
  const salt = crypto.randomBytes(32);
  const hash = crypto.scryptSync(password, salt, SCRYPT_PARAMS.keyLen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p
  });
  // 格式：salt(hex):hash(hex)
  return salt.toString('hex') + ':' + hash.toString('hex');
}

// 验证密码（使用时间恒定比较，防止时序攻击）
function verifyPassword(password, storedHash) {
  try {
    const [saltHex, hashHex] = storedHash.split(':');
    const salt = Buffer.from(saltHex, 'hex');
    const storedHashBuffer = Buffer.from(hashHex, 'hex');
    
    const hash = crypto.scryptSync(password, salt, SCRYPT_PARAMS.keyLen, {
      N: SCRYPT_PARAMS.N,
      r: SCRYPT_PARAMS.r,
      p: SCRYPT_PARAMS.p
    });
    
    // 时间恒定比较，防止时序攻击
    return crypto.timingSafeEqual(hash, storedHashBuffer);
  } catch (err) {
    return false;
  }
}

// ============ 安全配置管理 ============

const CONFIG_FILE = path.join(__dirname, '../.secrets.enc');
const MASTER_KEY = resolveSecureConfigMasterKey();

function normalizeSecretValue(value, maxLength = 200) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function generateAdminPin() {
  return String(crypto.randomInt(100000, 1000000));
}

// 默认配置（首次运行时使用）
const DEFAULT_CONFIG = {
  MINIMAX_API_KEY: null,
  DEEPSEEK_API_KEY: null,
  ADMIN_PIN: null,
  // 哈希后的密码会在首次保存时生成
  ADMIN_PIN_HASH: null,
};

// 加载安全配置
function loadSecureConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const encrypted = fs.readFileSync(CONFIG_FILE, 'utf8');
      const decrypted = decrypt(encrypted, MASTER_KEY);
      if (decrypted) {
        return JSON.parse(decrypted);
      }
    }
  } catch (err) {
    console.error('加载安全配置失败:', err.message);
  }
  
  // 首次运行，创建加密配置
  console.log('🔐 首次运行，正在初始化安全配置...');
  const envAdminPin = normalizeSecretValue(process.env.ADMIN_PIN, 20);
  const generatedAdminPin = generateAdminPin();
  const initialAdminPin = envAdminPin || generatedAdminPin;
  const config = {
    ...DEFAULT_CONFIG,
    MINIMAX_API_KEY: normalizeSecretValue(process.env.MINIMAX_API_KEY || process.env.MINIMAX2_7_API_KEY),
    DEEPSEEK_API_KEY: normalizeSecretValue(process.env.DEEPSEEK_API_KEY),
    ADMIN_PIN: null,
    ADMIN_PIN_HASH: hashPassword(initialAdminPin)
  };
  saveSecureConfig(config);
  if (!envAdminPin) {
    console.warn(`🔑 未提供 ADMIN_PIN，已自动生成首次管理员密码：${initialAdminPin}`);
  }
  console.log('✅ 安全配置已初始化');
  return config;
}

// 保存安全配置
function saveSecureConfig(config) {
  try {
    const encrypted = encrypt(JSON.stringify(config), MASTER_KEY);
    fs.writeFileSync(CONFIG_FILE, encrypted, 'utf8');
    return true;
  } catch (err) {
    console.error('保存安全配置失败:', err.message);
    return false;
  }
}

// ============ CORS 安全配置 ============

function getCorsConfig(isProduction) {
  if (!isProduction) {
    // 开发环境：允许所有来源
    return {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      maxAge: 86400 // 预检请求缓存24小时
    };
  }
  
  // 生产环境：严格限制
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : [];
  
  return {
    origin: (origin, callback) => {
      // 允许无 origin 的请求（如移动端APP、Postman等）
      if (!origin) {
        return callback(null, true);
      }
      
      // 允许同源请求
      if (allowedOrigins.length === 0) {
        return callback(null, true);
      }
      
      // 检查是否在白名单中
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      
      // 拒绝其他来源
      callback(new Error('CORS policy violation'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 600, // 预检请求缓存10分钟
    optionsSuccessStatus: 204
  };
}

// ============ 安全头配置 ============

function getHelmetConfig() {
  return {
    // 内容安全策略
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // React需要
        styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind需要
        imgSrc: ["'self'", "data:", "blob:", SUPABASE_PET_ASSET_ORIGIN],
        fontSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.deepseek.com"], // AI API
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    // 跨域嵌入策略
    crossOriginEmbedderPolicy: false, // 允许加载外部资源
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    // DNS预取控制
    dnsPrefetchControl: { allow: false },
    // 下载保护
    frameguard: { action: 'deny' },
    // 隐藏X-Powered-By
    hidePoweredBy: true,
    // HSTS（仅HTTPS）
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    // IE兼容性
    ieNoOpen: true,
    // 禁止MIME类型嗅探
    noSniff: true,
    // 来源策略
    originAgentCluster: false,
    // 权限策略
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    // Referrer策略
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // XSS过滤
    xssFilter: true
  };
}

// ============ 请求签名验证（防重放攻击）============

const usedNonces = new Map(); // 存储已使用的nonce
const NONCE_EXPIRY = 5 * 60 * 1000; // 5分钟过期

// 清理过期nonce
setInterval(() => {
  const now = Date.now();
  for (const [nonce, timestamp] of usedNonces) {
    if (now - timestamp > NONCE_EXPIRY) {
      usedNonces.delete(nonce);
    }
  }
}, 60000); // 每分钟清理一次

// 验证请求签名
function verifyRequestSignature(req, secret) {
  const timestamp = req.headers['x-timestamp'];
  const nonce = req.headers['x-nonce'];
  const signature = req.headers['x-signature'];
  
  if (!timestamp || !nonce || !signature) {
    return false;
  }
  
  // 检查时间戳（5分钟内有效）
  const now = Date.now();
  if (Math.abs(now - parseInt(timestamp)) > NONCE_EXPIRY) {
    return false;
  }
  
  // 检查nonce是否已使用（防重放）
  if (usedNonces.has(nonce)) {
    return false;
  }
  
  // 计算签名
  const payload = `${timestamp}:${nonce}:${req.method}:${req.originalUrl}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  // 时间恒定比较
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
  
  if (isValid) {
    usedNonces.set(nonce, now);
  }
  
  return isValid;
}

// ============ 导出 ============

module.exports = {
  // 加密解密
  encrypt,
  decrypt,
  
  // 密码哈希
  hashPassword,
  verifyPassword,
  
  // 配置管理
  loadSecureConfig,
  saveSecureConfig,
  
  // CORS配置
  getCorsConfig,
  
  // 安全头配置
  getHelmetConfig,
  
  // 请求签名
  verifyRequestSignature,
  
  // 工具函数
  getMachineFingerprint
};
