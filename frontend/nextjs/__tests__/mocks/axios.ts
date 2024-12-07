export const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn().mockReturnThis(),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() }
  }
};

jest.mock('axios', () => ({
  __esModule: true,
  default: mockAxios,
  create: () => mockAxios
})); 