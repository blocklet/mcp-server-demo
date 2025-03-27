import { useState } from 'react';

import blockletLogo from '../assets/blocklet.svg';
// @ts-ignore
import mcpLogo from '../assets/mcp.png';
import './home.css';

function Home() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href="https://www.modelcontextprotocol.io" target="_blank" rel="noreferrer">
          <img src={mcpLogo} className="logo" alt="MCP logo" />
        </a>
        <a href="https://www.arcblock.io/docs/blocklet-developer/getting-started" target="_blank" rel="noreferrer">
          <img src={blockletLogo} className="logo blocklet" alt="Blocklet logo" />
        </a>
      </div>
      <h1>Model Context Protocol + Blocklet</h1>
      <div className="card">
        <a type="button" href="/.well-known/service/mcp/servers" target="_blank" rel="noreferrer">
          Get MCP Server List
        </a>
        <br />
        <br />
        <button type="button" onClick={() => setCount((currentCount) => currentCount + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/app.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">Click on the MCP and Blocklet logos to learn more</p>
    </>
  );
}

export default Home;
