import { createContext } from "react";

// Provides a toggleColorMode function so any component can switch between light and dark themes.
const ColorModeContext = createContext({ toggleColorMode: () => {} });

export default ColorModeContext;
