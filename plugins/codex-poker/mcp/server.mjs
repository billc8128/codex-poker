import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const base=(process.env.CODEX_POKER_URL||"http://localhost:3000").replace(/\/$/,"");
const slugs=new Set(["doudizhu","zhajinhua","holdem","blackjack"]);
const server=new Server({name:"codex-poker",version:"0.1.0"},{capabilities:{tools:{}}});
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[{name:"open_poker",description:"Open the Codex Poker lobby or a specific virtual-point game table.",inputSchema:{type:"object",properties:{game:{type:"string",enum:[...slugs],description:"Optional game to open."}}}}]}));
server.setRequestHandler(CallToolRequestSchema,async request=>{if(request.params.name!=="open_poker")throw new Error("Unknown tool");const game=request.params.arguments?.game;const url=game&&slugs.has(game)?`${base}/play/${game}`:base;return{content:[{type:"resource_link",uri:url,name:game?`Open ${game}`:"Open Codex Poker",description:"Virtual Mtok points only; no cash value.",mimeType:"text/html"}]}});
await server.connect(new StdioServerTransport());
