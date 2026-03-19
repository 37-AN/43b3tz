def kelly(odds, prob):
    b = odds - 1
    q = 1 - prob

    if b <= 0:
        return 0

    f = (b * prob - q) / b

    return max(f, 0)
