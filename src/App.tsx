import { Room } from './components/Room';
import styled from '@emotion/styled';

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
`;

function App() {
  return (
    <AppContainer>
      <Room />
    </AppContainer>
  );
}

export default App;
