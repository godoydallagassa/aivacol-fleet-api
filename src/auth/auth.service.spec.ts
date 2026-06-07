import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

type MockUsersService = jest.Mocked<
  Pick<UsersService, 'findByUsernameWithPassword'>
>;
type MockJwtService = jest.Mocked<Pick<JwtService, 'signAsync'>>;

describe('AuthService', () => {
  const testUsername = 'unit-test-user';
  const testPassword = 'unit-test-password';
  let authService: AuthService;
  let usersService: MockUsersService;
  let jwtService: MockJwtService;

  beforeEach(() => {
    usersService = {
      findByUsernameWithPassword: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };
    authService = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );
  });

  it('returns a JWT when credentials are valid', async () => {
    usersService.findByUsernameWithPassword.mockResolvedValue({
      id: 'user-id',
      username: testUsername,
      passwordHash: await bcrypt.hash(testPassword, 4),
    } as never);

    const result = await authService.login({
      username: testUsername,
      password: testPassword,
    });

    expect(result).toEqual({ accessToken: 'signed-token' });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      username: testUsername,
    });
  });

  it('rejects invalid credentials', async () => {
    usersService.findByUsernameWithPassword.mockResolvedValue(null);

    await expect(
      authService.login({ username: testUsername, password: 'wrong-pass' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
