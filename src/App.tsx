import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { PrivateRoute } from "./components/PrivateRoute";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Home } from "./pages/Home";
import { CreateTask } from "./pages/CreateTask";
import { TaskCalendar } from "./pages/TaskCalendar";
import { DiaryCalendar } from "./pages/DiaryCalendar";
import { DiaryEntry } from "./pages/DiaryEntry";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          <Route
            path="/create-task"
            element={
              <PrivateRoute>
                <CreateTask />
              </PrivateRoute>
            }
          />
          <Route
            path="/task/:taskId"
            element={
              <PrivateRoute>
                <TaskCalendar />
              </PrivateRoute>
            }
          />
          <Route
            path="/diary"
            element={
              <PrivateRoute>
                <DiaryCalendar />
              </PrivateRoute>
            }
          />
          <Route
            path="/diary/entry/:date"
            element={
              <PrivateRoute>
                <DiaryEntry />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
