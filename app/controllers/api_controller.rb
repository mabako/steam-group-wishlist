require 'open-uri'

class ApiController < ApplicationController
  def show
    url = "http://steamcommunity.com/profiles/#{params[:id]}/wishlist?cc=us"
    doc = Nokogiri::HTML(open(url).read)
    
    # name display, with unicode derpness
    name = doc.search('h1').first.content

    items = doc.search('.wishlistRow')
    
    games = []
    items.each do |game|
      games << game.search('h4').first.content
    end
    
    respond_to do |format|
      format.json  { render :json => [name, games] }
      format.html  { render :text => name }
    end
  end
end
