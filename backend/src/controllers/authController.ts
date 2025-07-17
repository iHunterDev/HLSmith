import { Request, Response } from 'express';
import { DatabaseManager } from '../database/init';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { CreateUserData, LoginData, User, UserResponse, AuthResponse } from '../models/User';
import { ResponseHelper, ErrorCode } from '../utils/response';

const db = DatabaseManager.getInstance();

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password } = req.body as CreateUserData;

    // Validate input
    if (!username || !email || !password) {
      return ResponseHelper.validationError(res, '用户名、邮箱和密码不能为空', {
        fields: ['username', 'email', 'password']
      });
    }

    if (password.length < 6) {
      return ResponseHelper.validationError(res, '密码长度至少6位', {
        field: 'password',
        minLength: 6
      });
    }

    // Check registration permissions
    const allowRegistration = process.env.ALLOW_REGISTRATION === 'true';
    const allowFirstAdminRegistration = process.env.ALLOW_FIRST_ADMIN_REGISTRATION === 'true';

    // Check if any users exist (for first admin registration)
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    const isFirstUser = userCount.count === 0;

    // Registration permission check
    if (!allowRegistration && !(allowFirstAdminRegistration && isFirstUser)) {
      return ResponseHelper.authorizationError(res, '当前系统不允许注册新用户');
    }

    // Check if user already exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser) {
      return ResponseHelper.conflictError(res, '该邮箱或用户名已存在');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    await db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    // Get created user
    const newUser = await db.get(
      'SELECT id, username, email, created_at, updated_at FROM users WHERE email = ?',
      [email]
    ) as UserResponse;

    // Generate token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      username: newUser.username
    });

    const response: AuthResponse = {
      token,
      user: newUser
    };

    ResponseHelper.success(res, response, '注册成功', 201);
  } catch (error) {
    console.error('Registration error:', error);
    ResponseHelper.internalError(res, '注册失败，请稍后重试');
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as LoginData;

    // Validate input
    if (!email || !password) {
      return ResponseHelper.validationError(res, '邮箱和密码不能为空', {
        fields: ['email', 'password']
      });
    }

    // Find user
    const user = await db.get(
      'SELECT id, username, email, password, created_at, updated_at FROM users WHERE email = ?',
      [email]
    ) as User;

    if (!user) {
      return ResponseHelper.authenticationError(res, '邮箱或密码错误');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return ResponseHelper.authenticationError(res, '邮箱或密码错误');
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username
    });

    const userResponse: UserResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    const response: AuthResponse = {
      token,
      user: userResponse
    };

    ResponseHelper.success(res, response, '登录成功');
  } catch (error) {
    console.error('Login error:', error);
    ResponseHelper.internalError(res, '登录失败，请稍后重试');
  }
}

export async function profile(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const user = await db.get(
      'SELECT id, username, email, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    ) as UserResponse;

    if (!user) {
      return ResponseHelper.notFoundError(res, '用户不存在');
    }

    ResponseHelper.success(res, user, '获取用户信息成功');
  } catch (error) {
    console.error('Profile error:', error);
    ResponseHelper.internalError(res, '获取用户信息失败');
  }
}