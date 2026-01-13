import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Game from "./pages/Game";
import Games from "./pages/Games";
import Admin from "./pages/Admin";
import Deposit from "./pages/Deposit";
import RoomLobby from "./pages/RoomLobby";
import Room from "./pages/Room";
import OnlineGame from "./pages/OnlineGame";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/game" element={<Game />} />
          <Route path="/games" element={<Games />} />
          <Route path="/rooms" element={<RoomLobby />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/game/online/:roomId" element={<OnlineGame />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

