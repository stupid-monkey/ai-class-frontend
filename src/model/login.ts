export interface login {
  token: string,
		userInfo: {
			id: number,
			name: string,
			role: string,
			school?: string, username: string,
			mustChangePassword: boolean
		},
		expiresIn: number,
		mustChangePassword: true
}
