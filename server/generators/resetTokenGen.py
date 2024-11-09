import random

def generate_reset_token():
    return random.randint(100000000000, 999999999999)

if __name__ == "__main__":
    print(generate_reset_token())