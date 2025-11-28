import { Elysia, t } from "elysia";

const app = new Elysia({
	cookie: {
		// secrets: `' + console.log('pwned from secrets') + '`,

		domain: process.env.COOKIE_DOMAIN || "localhost",
	},
})
	.get("/", () => "hello world", {
		cookie: t.Cookie({
			foo: t.Any(),
		}),
	})
	.listen(3000);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
