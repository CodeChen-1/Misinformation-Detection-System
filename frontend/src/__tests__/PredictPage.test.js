import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import PredictPage from "../pages/PredictPage";
import api from "../api/axiosInstance";

jest.mock("../api/axiosInstance");
jest.mock("../components/ModelRecommendation", () => () => <div data-testid="model-recommendation" />);
jest.mock("../components/DataExplorer", () => () => <div data-testid="data-explorer" />);
jest.mock("../components/AnimatedContainer", () => ({
  StaggerContainer: ({ children }) => <div data-testid="stagger-container">{children}</div>,
  StaggerItem: ({ children }) => <div data-testid="stagger-item">{children}</div>,
}));

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] ?? null),
    setItem: jest.fn((key, val) => { store[key] = val; }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });
Object.defineProperty(window, "sessionStorage", { value: localStorageMock });

const renderPredictPage = () =>
  render(
    <BrowserRouter>
      <PredictPage />
    </BrowserRouter>
  );

describe("PredictPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  test("renders the main heading", () => {
    renderPredictPage();
    expect(screen.getByText("Misinformation Detector")).toBeInTheDocument();
  });

  test("shows all three tabs", () => {
    renderPredictPage();
    expect(screen.getByText("Single Text")).toBeInTheDocument();
    expect(screen.getByText("URL")).toBeInTheDocument();
    expect(screen.getByText("Batch CSV")).toBeInTheDocument();
  });

  test("default tab shows text input area", () => {
    renderPredictPage();
    expect(screen.getByText(/Enter text to analyze/)).toBeInTheDocument();
  });

  test("switching to URL tab shows URL input", () => {
    renderPredictPage();
    const urlTab = screen.getByText("URL");
    fireEvent.click(urlTab);
    expect(screen.getByPlaceholderText("https://example.com/article")).toBeInTheDocument();
  });

  test("switching to CSV tab shows upload area", () => {
    renderPredictPage();
    const csvTab = screen.getByText("Batch CSV");
    fireEvent.click(csvTab);
    expect(screen.getByText(/Drag & drop or click to upload CSV files/)).toBeInTheDocument();
  });

  test("URL validation shows error for non-http URL", async () => {
    renderPredictPage();
    const urlTab = screen.getByText("URL");
    fireEvent.click(urlTab);

    const urlInput = screen.getByPlaceholderText("https://example.com/article");
    fireEvent.change(urlInput, { target: { value: "ftp://bad.com" } });

    const predictButton = screen.getByRole("button", { name: /analyze url/i });
    fireEvent.click(predictButton);

    await waitFor(() => {
      expect(screen.getByText("URL must start with http:// or https://")).toBeInTheDocument();
    });
  });

  test("Predict button is disabled when URL tab has no input", () => {
    renderPredictPage();
    const urlTab = screen.getByText("URL");
    fireEvent.click(urlTab);

    const predictButton = screen.getByRole("button", { name: /analyze url/i });
    expect(predictButton).toBeDisabled();
  });

  test("Predict button is enabled when URL tab has valid input", () => {
    renderPredictPage();
    const urlTab = screen.getByText("URL");
    fireEvent.click(urlTab);

    const urlInput = screen.getByPlaceholderText("https://example.com/article");
    fireEvent.change(urlInput, { target: { value: "https://example.com" } });

    const predictButton = screen.getByRole("button", { name: /analyze url/i });
    expect(predictButton).not.toBeDisabled();
  });

  test("Configure Model Settings button is present", () => {
    renderPredictPage();
    expect(screen.getByText("Configure Model Settings")).toBeInTheDocument();
  });

  test("shows Upload File button on text tab", () => {
    renderPredictPage();
    expect(screen.getByText("Upload File")).toBeInTheDocument();
  });

  test("shows Clear button on text tab", () => {
    renderPredictPage();
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  test("Predict button is disabled on URL tab with empty input", () => {
    renderPredictPage();
    const urlTab = screen.getByText("URL");
    fireEvent.click(urlTab);
    const btn = screen.getByRole("button", { name: /analyze url/i });
    expect(btn).toBeDisabled();
  });
});
