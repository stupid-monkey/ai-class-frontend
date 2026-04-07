export interface login {
  token: string,
		userInfo: {
			id: number,
			name: string,
			role: string,
			username: string,
			mustChangePassword: boolean
		},
		expiresIn: number,
		mustChangePassword: true
}