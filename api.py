from openai import OpenAI
import os
from dotenv import load_dotenv,find_dotenv
_=load_dotenv(find_dotenv())
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
# client = OpenAI(api_key="")

response = client.chat.completions.create(
    model="gpt-4.1",  # or "gpt-4o", "gpt-4.1-mini", etc.
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Generate random sentence."}
    ],
    temperature=0
)

print(response.choices[0].message.content)

input_tokens = response.usage.prompt_tokens
output_tokens = response.usage.completion_tokens
print(f"Input:{input_tokens}, Output:{output_tokens}")


def calculate_cost(model_name: str, input_tokens: int, output_tokens: int) -> float:
    """
    Estimate the cost (in USD) of an OpenAI API call
    based on model and token usage.
    """

    prices = {
        "gpt-4o": {"input": 0.005, "output": 0.015},
        "gpt-4.1": {"input": 0.01, "output": 0.03},
        "gpt-4.1-mini": {"input": 0.0005, "output": 0.0015},
        "gpt-5": {"input": 0.015, "output": 0.045},  
    }

    if model_name not in prices:
        raise ValueError(f"Unknown model: {model_name}")

    input_rate = prices[model_name]["input"]
    output_rate = prices[model_name]["output"]

    # Convert tokens ---> cost
    cost = (input_tokens / 1000) * input_rate + (output_tokens / 1000) * output_rate
    return round(cost, 6)


cost = calculate_cost("gpt-4o", input_tokens, output_tokens)
print(f"Estimated cost: ${cost}")

