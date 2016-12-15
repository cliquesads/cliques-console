The **Cliques Console API** exposes CRUD methods to core Cliques entities such as **Advertisers, Publishers,
Organizations, Users, Payments**, as well as read access to the Cliques Aggregation collections.

## Endpoints & Authentication
There are currently two API roots for different authentication methods:

### `/console` - Basic Auth with Sessions
```
https://console.cliquesads.com/console
```
This root is designed for consumption by the Cliques Console UI, not by external API clients. It uses basic auth w/ sessions.
You do not authenticate each request, but instead need to `POST` to `/signin` with your authentication credentials in
order to begin an API session.

### `/api` - Basic Auth, no Sessions
```
https://console.cliquesads.com/api
```
This root is designed for 3rd API consumers, but is also handy for internal development purposes since you don't have to
maintain an authenticated session. Basic auth credentials are provided with each request, and each request is authenticated
individually.

#### Example Request Setting Basic Auth Header
```
curl https://console.cliquesads.com/api/publisher/1234567 -u username:password
```

The API path structure from this root is *IDENTICAL* to the `/console` path structure, so for documentation purposes,
`/api` is used as the root path.




