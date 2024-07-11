base_url = "https://scholar.google.com"

function scrape_citations(user_id::String)
    # Construct the URL
    url = "https://scholar.google.com/citations?user=$user_id&oe=UTF8&view_op=list_works&sortby=pubdate&pagesize=12"

    # Fetch the web page
    response = HTTP.get(url)

    # Check if the request was successful
    if response.status != 200
        println("Failed to fetch the URL: $url")
        return
    end

    all_publications = []

    main_page = parsehtml(String(response.body))

    # publication link
    link_selector = Selector(".gsc_a_at")

    links = eachmatch(link_selector, main_page.root)

    # go to the link
    for link in links
        pub = HTTP.get(base_url * getattr(link, "href") * "&oe=UTF8")
        pub_page = parsehtml(String(pub.body))
        title_selector = Selector("#gsc_oci_title")
        title_div = eachmatch(title_selector, pub_page.root)[1]
        title = ""
        href = ""

        if title_div.children[1] isa HTMLText
            title = title_div.children[1].text
        else
            title = title_div.children[1].children[1].text
            href = getattr(title_div.children[1], "href")
        end

        field_selector = Selector(".gsc_oci_field")
        value_selector = Selector(".gsc_oci_value")

        fields_html = eachmatch(field_selector, pub_page.root)
        values_html = eachmatch(value_selector, pub_page.root)

        extra = Dict{String,Any}()

        for (field, value) in zip(fields_html, values_html)
            if field.children[1] isa HTMLText && value.children[1] isa HTMLText
                merge!(extra, Dict(field.children[1].text => value.children[1].text))
            end
        end

        # push to all_publications title, href if it exists, and all of extra's fields
        if href == ""
            push!(all_publications, Dict([("Título", title), pairs(extra)...]))
        else
            push!(all_publications, Dict([("Título", title), ("Link", href), pairs(extra)...]))
        end
    end
    all_publications
end



# Define the command line argument parser
function main()
    s = ArgParseSettings()
    @add_arg_table s begin
        "user_id"
        help = "Google Scholar User ID"
    end
    parsed_args = parse_args(s)
    all_publications = scrape_citations(parsed_args["user_id"])

    # convert to json
    json_publications = JSON.json(all_publications)

    open("publications.json", "w") do f
        write(f, json_publications)
    end

end

main()
