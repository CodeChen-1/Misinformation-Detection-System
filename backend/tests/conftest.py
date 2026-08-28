import io
import csv
import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_real_text():
    return "The weather today is nice and sunny. I went for a walk in the park and enjoyed the fresh air."


@pytest.fixture
def sample_fake_text():
    return "URGENT: They don't want you to know the hidden truth! Big Pharma is hiding the miracle cure! Click here for free money!"


@pytest.fixture
def sample_text_short():
    return "hi"


@pytest.fixture
def sample_text_cleanable_empty():
    return "!!!??? 123 ***"


@pytest.fixture
def sample_csv_bytes():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["text"])
    writer.writerow(["The moon landing was faked by the government."])
    writer.writerow(["Scientists have discovered a new species of butterfly."])
    writer.writerow(["You won't believe what happens next! Click here!"])
    return output.getvalue().encode()


@pytest.fixture
def sample_csv_no_text_column():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "content"])
    writer.writerow(["1", "Some text here."])
    writer.writerow(["2", "More text here."])
    return output.getvalue().encode()


@pytest.fixture
def sample_csv_over_limit():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["text"])
    for i in range(1001):
        writer.writerow([f"Row {i} text content."])
    return output.getvalue().encode()
