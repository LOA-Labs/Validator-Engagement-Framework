# Stargaze Mainnet (stargaze-1)

Carbon neutral Cosmos SDK-based decentralized interchain NFT marketplace and social network. 

## Stargaze (Public Awesome) Organization Resources

* Website [https://www.stargaze.zone/](https://www.stargaze.zone/)
* Twitter [https://twitt...m/stargazezone](https://twitter.com/stargazezone)
* Discord [https://discord.gg/stargaze](https://discord.gg/stargaze)
* Governance [https://gov.stargaze.zone/](https://gov.stargaze.zone/)
* Blog [https://mediu...rgaze-protocol](https://medium.com/stargaze-protocol)
* Telegram n/a
* Youtube n/a

## stargaze-1 Chain Resources

* Repo [https://githu...public-awesome](https://github.com/public-awesome)
* Docs [https://docs..../guides/readme](https://docs.stargaze.zone/guides/readme)
* Explorer [https://www.m...an.io/stargaze](https://www.mintscan.io/stargaze)
* Validator Status [https://www.m...hk2tw3n8v5mxad](https://www.mintscan.io/stargaze/validators/starsvaloper16gzehchwqzl5p2gmx2jfnf22hk2tw3n8v5mxad)
* Delegate to LOA Labs: [Earn Rewards via Keplr](https://wallet.keplr.app/chains/stargaze?modal=validator&chain=stargaze-1&validator_address=starsvaloper16gzehchwqzl5p2gmx2jfnf22hk2tw3n8v5mxad&referral=true)

## Activities / Contributions
| Date | Title | Desc | Link | Type |
| :----------- | :------------ | :-------------------------------- | :---- | :---- |
| 2023-06-04 | Relayer Upgrades and Channel Maintenance | Check wallet balances, check connections. | [https://www.m...ver/channel-19](https://www.mintscan.io/regen/relayers/channel-63/quicksilver/channel-19) | INF-2, INF-1 |
| 2023-05-26 | Prop 166 Sg721 check & vote | Sg721 Updatable Contract v2.3.1. Check storecode hash a5998921bbb64375ab435d89014b48227b5c62f987eef9821f80c8e4e3764a9f | [https://www.m...bd8ff017f2f448](https://www.mintscan.io/stargaze/txs/50759edf1f4f9246db3ea633f0c541cbd1c3a330e8fbe1e66bbd8ff017f2f448) | GOV-6, PGs-13 |
| 2023-05-25 | Prop 165 Vote | Yes. Good to see initiative taken here to improve tokenomics.  | [https://www.m...height=8371426](https://www.mintscan.io/stargaze/txs/63A278BF23AA54BC1765AD7BE9D1499A2F466D647D88E723B639FD59362B253F?height=8371426) | GOV-6, GOV-7 |
| 2023-05-20 | Prop 164, Storecode check hash and Vote  | public bash function for checking prop store code<br><br>`81d325cc6c8188b702fef5b058afd13248e218ca902bc7b9f9d8ebac20fc8265`<br><br># prop wasm storecode check<br><br>function checksc {<br>${DAEMON_NAME} q gov proposal $1 --output json \| jq -r '.content.wasm_byte_code' \| base64 -d \| gzip -dc \| sha256sum<br>}<br><br>[https://githu...-bash-aliases/](https://github.com/LOA-Labs/cosmos-sdk-daemon-bash-aliases/) | [https://www.m...568BBFEA81E7C8](https://www.mintscan.io/stargaze/txs/2273CB9F27BB3510B2D630DF5309D377EED75A5FAA09B2EFE7568BBFEA81E7C8) | GOV-6, PGs-13, PGs-12 |
| 2023-04-28 | Release Validator Engagement Framework | Repo outlines how LOA Labs validator engages with each chain and logs of delivered goods and services. Manages tracking and records of events.  | [https://githu...ment-Framework](https://github.com/LOA-Labs/Validator-Engagement-Framework) | PGs-12 |
| 2023-04-11 | Decentralized Blockchain Governance Thesis (Best Practices) | Aims to outline the key components and best practices in blockchain governance, at mid-to-high level, without getting too detailed about specifics which may vary from one community to the next.<br><br>Document is iterative and collaborative; it covers a non-exhaustive list of components that are important to governance; your suggestions and contributions are welcome. | [https://gov.vs.loalabs.io/](https://gov.vs.loalabs.io/) | GOV-9, GOV-6, PGs-12 |
| 2022-12-07 | LOA Node Toolkit (LNT) Launched | Highly configurable and lightweight Nodejs toolkit for monitoring, governing, and financing validator nodes on Cosmos. | [https://githu...a-node-toolkit](https://github.com/LOA-Labs/loa-node-toolkit) | PGs-12, INF-5, PGs-14 |
| 2022-04-18 | Launch Mainnet Validator | Top level validator services provided to carbon neutral and public goods focused NFT and Smart Contracts chain.  | [https://www.m...hk2tw3n8v5mxad](https://www.mintscan.io/stargaze/validators/starsvaloper16gzehchwqzl5p2gmx2jfnf22hk2tw3n8v5mxad) | INF-1, GOV-10 |